import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { createReadStream, existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { db, schema } from "../lib/db.js";
import { requireAdmin, requireMember, requireUser } from "../lib/auth.js";
import { fail, notFound } from "../lib/http.js";
import { config } from "../lib/config.js";
import { moveCommission, releaseDue } from "../lib/ledger.js";
import { audit } from "../lib/audit.js";
import { userMap } from "../lib/views.js";
import { slugify, shortId } from "../lib/text.js";

const E = schema.experiences, B = schema.businesses, S = schema.services, BK = schema.bookings, C = schema.commissions, U = schema.users;

export default async function businessRoutes(app: FastifyInstance) {
  /* ================= MERCHANT PORTAL ================= */
  app.get("/merchant", async (req) => {
    const u = await requireUser(req);
    const { b } = z.object({ b: z.coerce.number().int().positive().optional() }).parse(req.query);
    const mine = u.isAdmin
      ? await db.select().from(B).orderBy(asc(B.name))
      : u.businessIds.length ? await db.select().from(B).where(inArray(B.id, u.businessIds)).orderBy(asc(B.name)) : [];
    if (!mine.length) return { businesses: [], dashboard: null };
    const biz = mine.find((x) => x.id === b) ?? mine[0]!;
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const kpi = await db.select({
      referred: sql<number>`sum(case when ${BK.recommenderId} is not null then 1 else 0 end)`,
      completed: sql<number>`sum(case when ${BK.status} = 'completed' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${BK.status} = 'cancelled' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    }).from(BK).where(and(eq(BK.businessId, biz.id), gte(BK.createdAt, monthStart)));
    const owed = await db.select({ p: sql<number>`coalesce(sum(${C.platformPaise}),0)`, n: sql<number>`count(*)` }).from(C).innerJoin(BK, eq(BK.id, C.bookingId))
      .where(and(eq(BK.businessId, biz.id), eq(BK.status, "completed"), gte(BK.completedAt, monthStart)));
    const upcoming = await db.select({ bk: BK, s: S }).from(BK).innerJoin(S, eq(S.id, BK.serviceId))
      .where(and(eq(BK.businessId, biz.id), gte(BK.slotAt, new Date(Date.now() - 12 * 36e5)))).orderBy(asc(BK.slotAt)).limit(30);
    const people = await userMap(upcoming.flatMap((r) => [r.bk.userId, r.bk.recommenderId ?? 0]));
    const visitReqs = await db.select({ e: E, u: U }).from(E).innerJoin(U, eq(U.id, E.authorId))
      .where(and(eq(E.businessId, biz.id), eq(E.status, "pending"), eq(E.proofType, "business_confirm"))).orderBy(desc(E.createdAt));
    const reviews = await db.select({ e: E, u: U }).from(E).innerJoin(U, eq(U.id, E.authorId))
      .where(and(eq(E.businessId, biz.id), eq(E.status, "published"))).orderBy(desc(E.publishedAt)).limit(20);
    const svcs = await db.select().from(S).where(eq(S.businessId, biz.id)).orderBy(asc(S.name));
    const statement = await db.select({ bk: BK, c: C, s: S }).from(C).innerJoin(BK, eq(BK.id, C.bookingId)).innerJoin(S, eq(S.id, BK.serviceId))
      .where(and(eq(BK.businessId, biz.id), eq(BK.status, "completed"))).orderBy(desc(BK.completedAt)).limit(50);
    return {
      businesses: mine.map((x) => ({ id: x.id, name: x.name, slug: x.slug })),
      dashboard: {
        business: { id: biz.id, name: biz.name, slug: biz.slug, city: biz.city, area: biz.area, commissionPct: biz.commissionBps / 100 },
        kpis: { referred: Number(kpi[0]?.referred ?? 0), completed: Number(kpi[0]?.completed ?? 0), cancelled: Number(kpi[0]?.cancelled ?? 0), total: Number(kpi[0]?.total ?? 0), owedPaise: Number(owed[0]?.p ?? 0), owedVisits: Number(owed[0]?.n ?? 0) },
        upcoming: upcoming.map(({ bk, s }) => ({ id: bk.id, slotAt: bk.slotAt, status: bk.status, service: s.name, client: people.get(bk.userId)?.name ?? "Member", via: bk.recommenderId ? `${people.get(bk.recommenderId)?.name ?? "A member"}'s review` : "Direct" })),
        visitRequests: visitReqs.map(({ e, u: a }) => ({ id: e.id, title: e.title, author: a.name, visitedOn: e.visitedOn, createdAt: e.createdAt })),
        reviews: reviews.map(({ e, u: a }) => ({ id: e.id, slug: e.slug, title: e.title, author: a.name, rating: e.ratingX10 / 10, level: e.level, quote: e.story.length > 180 ? e.story.slice(0, 177).trimEnd() + "…" : e.story, reply: e.businessReply })),
        services: svcs.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, pricePaise: s.pricePaise, active: s.active })),
        statement: statement.map(({ bk, c, s }) => ({ bookingId: bk.id, completedAt: bk.completedAt, service: s.name, pricePaise: bk.pricePaise, commissionPaise: c.platformPaise })),
      },
    };
  });

  /** Confirming a visit by its check-in code completes the booking and starts the refund window. */
  app.post("/merchant/:bizId/confirm", { config: { rateLimit: { max: 30, timeWindow: "10 minutes" } } }, async (req) => {
    const bizId = Number((req.params as any).bizId);
    const u = await requireMember(req, bizId);
    const { code } = z.object({ code: z.string().transform((v) => v.replace(/\s/g, "")).pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code")) }).parse(req.body);
    const [bk] = await db.select({ bk: BK, s: S }).from(BK).innerJoin(S, eq(S.id, BK.serviceId)).where(and(eq(BK.businessId, bizId), eq(BK.code, code))).limit(1);
    if (!bk) fail(404, "code_not_found", "No booking with that code at this business.");
    if (bk!.bk.status === "completed") fail(409, "already_confirmed", "That visit is already confirmed.");
    if (bk!.bk.status === "cancelled") fail(409, "cancelled", "That booking was cancelled.");
    // Visits are confirmed on the day, not in advance.
    if (bk!.bk.slotAt.getTime() - Date.now() > config.confirmWindowHours * 36e5) fail(409, "too_early", "That booking is for a later date. Confirm it when the client arrives.");
    await db.update(BK).set({ status: "completed", completedAt: new Date() }).where(eq(BK.id, bk!.bk.id));
    const [c] = await db.select().from(C).where(eq(C.bookingId, bk!.bk.id)).limit(1);
    if (c && c.status === "estimated") await moveCommission(c, "pending_settlement", "Visit confirmed by business", { settleAfter: new Date(Date.now() + config.settleDays * 864e5) });
    await audit(u.id, "booking", bk!.bk.id, "visit_confirmed");
    const client = (await userMap([bk!.bk.userId])).get(bk!.bk.userId);
    return { ok: true, client: client?.name ?? "Member", service: bk!.s.name };
  });

  app.post("/merchant/:bizId/visit-requests/:expId", async (req) => {
    const bizId = Number((req.params as any).bizId), expId = Number((req.params as any).expId);
    const u = await requireMember(req, bizId);
    const { decision } = z.object({ decision: z.enum(["confirm", "decline"]) }).parse(req.body);
    const [e] = await db.select().from(E).where(and(eq(E.id, expId), eq(E.businessId, bizId), eq(E.status, "pending"), eq(E.proofType, "business_confirm"))).limit(1);
    if (!e) return notFound();
    if (decision === "confirm") {
      await db.update(E).set({ status: "published", level: 2, publishedAt: new Date() }).where(eq(E.id, expId));
      await audit(u.id, "experience", expId, "visit_confirmed_by_business");
    } else {
      // A decline doesn't delete the review: it goes to a moderator with the business's answer.
      await db.update(E).set({ proofType: "receipt", rejectReason: "Business couldn't confirm this visit — add a receipt" }).where(eq(E.id, expId));
      await audit(u.id, "experience", expId, "visit_declined_by_business");
    }
    return { ok: true };
  });

  app.post("/merchant/:bizId/reviews/:expId/reply", async (req) => {
    const bizId = Number((req.params as any).bizId), expId = Number((req.params as any).expId);
    const u = await requireMember(req, bizId);
    const { body } = z.object({ body: z.string().trim().min(5).max(1500) }).parse(req.body);
    const [e] = await db.select({ id: E.id }).from(E).where(and(eq(E.id, expId), eq(E.businessId, bizId), eq(E.status, "published"))).limit(1);
    if (!e) return notFound();
    await db.update(E).set({ businessReply: body, businessReplyAt: new Date() }).where(eq(E.id, expId));
    await audit(u.id, "experience", expId, "business_replied");
    return { ok: true };
  });

  app.post("/merchant/:bizId/services", async (req) => {
    const bizId = Number((req.params as any).bizId);
    await requireMember(req, bizId);
    const b = z.object({ name: z.string().trim().min(2).max(120), durationMin: z.number().int().min(10).max(1440), priceRupees: z.number().int().min(1).max(500000), unit: z.string().trim().max(30).optional() }).parse(req.body);
    await db.insert(S).values({ businessId: bizId, name: b.name, durationMin: b.durationMin, pricePaise: b.priceRupees * 100, unit: b.unit });
    return { ok: true };
  });

  app.patch("/merchant/:bizId/services/:id", async (req) => {
    const bizId = Number((req.params as any).bizId), id = Number((req.params as any).id);
    await requireMember(req, bizId);
    const b = z.object({ active: z.boolean().optional(), priceRupees: z.number().int().min(1).max(500000).optional() }).parse(req.body);
    await db.update(S).set({ ...(b.active !== undefined ? { active: b.active } : {}), ...(b.priceRupees ? { pricePaise: b.priceRupees * 100 } : {}) })
      .where(and(eq(S.id, id), eq(S.businessId, bizId)));
    return { ok: true };
  });

  /* ================= ADMIN ================= */
  app.get("/admin/overview", async (req) => {
    await requireAdmin(req);
    await releaseDue();
    const queue = await db.select({ e: E, b: B, u: U }).from(E).innerJoin(B, eq(B.id, E.businessId)).innerJoin(U, eq(U.id, E.authorId))
      .where(eq(E.status, "pending")).orderBy(asc(E.createdAt)).limit(50);
    const evidenceCounts = new Map<string, number>();
    for (const r of queue) if (r.e.evidencePath) evidenceCounts.set(r.e.evidencePath, (evidenceCounts.get(r.e.evidencePath) ?? 0) + 1);
    const reportRows = await db.select({ r: schema.reports, e: E }).from(schema.reports).innerJoin(E, eq(E.id, schema.reports.experienceId))
      .where(eq(schema.reports.status, "open")).orderBy(asc(schema.reports.createdAt));
    const leadRows = await db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(30);
    const payoutRows = await db.select({ p: schema.payouts, u: U }).from(schema.payouts).innerJoin(U, eq(U.id, schema.payouts.userId)).where(eq(schema.payouts.status, "requested"));
    const comm = await db.select({ status: C.status, n: sql<number>`count(*)`, sum: sql<number>`coalesce(sum(${C.amountPaise}),0)` }).from(C).groupBy(C.status);
    const bizRows = await db.select().from(B).orderBy(asc(B.name));
    const members = await db.select({ m: schema.businessMembers, u: U }).from(schema.businessMembers).innerJoin(U, eq(U.id, schema.businessMembers.userId));
    const auditRows = await db.select().from(schema.auditEvents).orderBy(desc(schema.auditEvents.id)).limit(40);
    const actors = await userMap(auditRows.map((a) => a.actorId ?? 0));
    const counts = await db.select({ users: sql<number>`(select count(*) from users)`, published: sql<number>`(select count(*) from experiences where status='published')`, bookings: sql<number>`(select count(*) from bookings)`, completed: sql<number>`(select count(*) from bookings where status='completed')` }).from(sql`(select 1) x`);
    return {
      counts: counts[0],
      queue: queue.map(({ e, b, u }) => ({
        id: e.id, slug: e.slug, title: e.title, business: b.name, author: u.name, authorEmail: u.email, proofType: e.proofType, hasEvidence: !!e.evidencePath,
        visitedOn: e.visitedOn, createdAt: e.createdAt, note: e.rejectReason,
        signals: [
          ...(e.proofType === "receipt" && !e.evidencePath ? ["No receipt uploaded yet"] : []),
          ...(e.evidencePath && (evidenceCounts.get(e.evidencePath) ?? 0) > 1 ? ["Same file used on another submission"] : []),
          ...(e.freeOrDiscounted ? ["Free or discounted — disclosure will show"] : []),
        ],
      })),
      reports: reportRows.map(({ r, e }) => ({ id: r.id, reason: r.reason, createdAt: r.createdAt, experience: { slug: e.slug, title: e.title } })),
      leads: leadRows,
      payouts: payoutRows.map(({ p, u }) => ({ id: p.id, amountPaise: p.amountPaise, createdAt: p.createdAt, user: u.name, email: u.email })),
      commissions: comm.map((c) => ({ status: c.status, count: Number(c.n), amountPaise: Number(c.sum) })),
      businesses: bizRows.map((b) => ({ id: b.id, name: b.name, slug: b.slug, city: b.city, category: b.category, commissionPct: b.commissionBps / 100, isSample: b.isSample, members: members.filter((m) => m.m.businessId === b.id).map((m) => m.u.email) })),
      audit: auditRows.map((a) => ({ id: a.id, at: a.createdAt, actor: a.actorId ? actors.get(a.actorId)?.name ?? `user ${a.actorId}` : "System", entity: `${a.entityType}${a.entityId ? ` #${a.entityId}` : ""}`, action: a.action, reason: a.reason })),
    };
  });

  app.post("/admin/experiences/:id/decision", async (req) => {
    const u = await requireAdmin(req);
    const id = Number((req.params as any).id);
    const b = z.object({ decision: z.enum(["approve", "reject"]), level: z.number().int().min(1).max(3).optional(), reason: z.string().trim().min(3).max(200) }).parse(req.body);
    const [e] = await db.select().from(E).where(eq(E.id, id)).limit(1);
    if (!e) return notFound();
    if (b.decision === "approve") {
      const level = b.level ?? (e.proofType === "receipt" ? 1 : 2);
      await db.update(E).set({ status: "published", level, publishedAt: e.publishedAt ?? new Date(), rejectReason: null }).where(eq(E.id, id));
    } else {
      await db.update(E).set({ status: "rejected", rejectReason: b.reason }).where(eq(E.id, id));
    }
    await audit(u.id, "experience", id, `verification_${b.decision}d`, b.reason);
    return { ok: true };
  });

  app.get("/admin/experiences/:id/evidence", async (req, reply) => {
    const u = await requireAdmin(req);
    const id = Number((req.params as any).id);
    const [e] = await db.select().from(E).where(eq(E.id, id)).limit(1);
    if (!e?.evidencePath) return notFound("No evidence");
    const base = normalize(config.uploadDir);
    const p = normalize(join(base, e.evidencePath));
    if (!p.startsWith(base) || !existsSync(p)) return notFound("No evidence");
    await audit(u.id, "experience", id, "evidence_viewed");
    const type = p.endsWith(".pdf") ? "application/pdf" : p.endsWith(".png") ? "image/png" : p.endsWith(".webp") ? "image/webp" : "image/jpeg";
    reply.header("Content-Type", type).header("Cache-Control", "no-store").header("Content-Disposition", "inline");
    return reply.send(createReadStream(p));
  });

  app.post("/admin/reports/:id", async (req) => {
    const u = await requireAdmin(req);
    const id = Number((req.params as any).id);
    const { decision, reason } = z.object({ decision: z.enum(["dismiss", "uphold"]), reason: z.string().trim().min(3).max(200) }).parse(req.body);
    const [r] = await db.select().from(schema.reports).where(eq(schema.reports.id, id)).limit(1);
    if (!r) return notFound();
    await db.update(schema.reports).set({ status: decision === "uphold" ? "upheld" : "dismissed" }).where(eq(schema.reports.id, id));
    if (decision === "uphold") await db.update(E).set({ status: "rejected", rejectReason: reason }).where(eq(E.id, r.experienceId));
    await audit(u.id, "report", id, `report_${decision === "uphold" ? "upheld" : "dismissed"}`, reason);
    return { ok: true };
  });

  app.post("/admin/payouts/:id", async (req) => {
    const u = await requireAdmin(req);
    const id = Number((req.params as any).id);
    const { decision, reference } = z.object({ decision: z.enum(["paid", "rejected"]), reference: z.string().trim().max(40).optional() }).parse(req.body);
    const [p] = await db.select().from(schema.payouts).where(and(eq(schema.payouts.id, id), eq(schema.payouts.status, "requested"))).limit(1);
    if (!p) return notFound();
    const linked = await db.select().from(C).where(eq(C.payoutId, id));
    if (decision === "paid") {
      await db.update(schema.payouts).set({ status: "paid", paidAt: new Date(), reference: reference ?? `FH-PO-${String(id).padStart(4, "0")}` }).where(eq(schema.payouts.id, id));
      for (const c of linked) await moveCommission(c, "paid", `Paid out in payout #${id}`);
    } else {
      await db.update(schema.payouts).set({ status: "rejected" }).where(eq(schema.payouts.id, id));
      await db.update(C).set({ payoutId: null }).where(eq(C.payoutId, id));
    }
    await audit(u.id, "payout", id, `payout_${decision}`, reference);
    return { ok: true };
  });

  app.post("/admin/commissions/release-due", async (req) => {
    const u = await requireAdmin(req);
    const n = await releaseDue();
    await audit(u.id, "commission", null, "release_due", `${n} released`);
    return { released: n };
  });

  app.post("/admin/businesses", async (req) => {
    const u = await requireAdmin(req);
    const b = z.object({
      name: z.string().trim().min(2).max(120), category: z.enum(schema.CATEGORIES), city: z.string().trim().min(2).max(60), area: z.string().trim().max(120).optional(),
      commissionPct: z.number().min(1).max(40), hoursText: z.string().trim().max(200).optional(),
    }).parse(req.body);
    const r = await db.insert(B).values({ slug: `${slugify(b.name, 60)}-${shortId(4)}`, name: b.name, category: b.category, city: b.city, area: b.area, hoursText: b.hoursText, commissionBps: Math.round(b.commissionPct * 100) }).$returningId();
    await audit(u.id, "business", r[0]!.id, "business_created", `${b.commissionPct}%`);
    return { id: r[0]!.id };
  });

  app.post("/admin/businesses/:id/members", async (req) => {
    const u = await requireAdmin(req);
    const id = Number((req.params as any).id);
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
    let [m] = await db.select().from(U).where(eq(U.email, email)).limit(1);
    if (!m) { const r = await db.insert(U).values({ email }).$returningId(); [m] = await db.select().from(U).where(eq(U.id, r[0]!.id)); }
    await db.insert(schema.businessMembers).values({ businessId: id, userId: m!.id }).onDuplicateKeyUpdate({ set: { role: "owner" } });
    await audit(u.id, "business", id, "member_added", email);
    return { ok: true };
  });

  app.post("/admin/leads/:id", async (req) => {
    await requireAdmin(req);
    const { status } = z.object({ status: z.enum(["new", "contacted", "closed"]) }).parse(req.body);
    await db.update(schema.leads).set({ status }).where(eq(schema.leads.id, Number((req.params as any).id)));
    return { ok: true };
  });
}
