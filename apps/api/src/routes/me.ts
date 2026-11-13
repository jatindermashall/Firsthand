import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createWriteStream, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { join, extname } from "node:path";
import { db, schema } from "../lib/db.js";
import { requireUser } from "../lib/auth.js";
import { fail, notFound } from "../lib/http.js";
import { config } from "../lib/config.js";
import { platformCommission, recommenderShare } from "../lib/money.js";
import { moveCommission, releaseDue, sumBy } from "../lib/ledger.js";
import { audit } from "../lib/audit.js";
import { listCards, userMap, authorView } from "../lib/views.js";
import { initials, maskContacts, slugify, shortId } from "../lib/text.js";
import { randomInt } from "node:crypto";

const E = schema.experiences, B = schema.businesses, S = schema.services, BK = schema.bookings, C = schema.commissions;

export default async function meRoutes(app: FastifyInstance) {
  /* ---------- share an experience ---------- */
  app.post("/experiences", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (req) => {
    const u = await requireUser(req);
    if (!u.name) fail(400, "profile_needed", "Add your name to your profile first.");
    const b = z.object({
      businessId: z.number().int().positive(), serviceId: z.number().int().positive().optional(),
      visitedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), whoFor: z.enum(["Just me", "Couple", "Family", "Friends"]).default("Just me"),
      rating: z.number().min(1).max(5).multipleOf(0.5), title: z.string().trim().max(160).optional(),
      story: z.string().trim().min(40, "Tell people a bit more — at least 40 characters.").max(5000),
      pros: z.string().trim().max(1500).optional(), cons: z.string().trim().max(1500).optional(), suits: z.string().trim().max(200).optional(),
      parking: z.string().trim().max(160).optional(), access: z.string().trim().max(160).optional(), pricePaid: z.string().trim().max(80).optional(),
      proofType: z.enum(["firsthand_booking", "business_confirm", "receipt"]),
      freeOrDiscounted: z.boolean().default(false), consent: z.literal(true), honest: z.literal(true),
    }).parse(req.body);
    if (new Date(b.visitedOn).getTime() > Date.now() + 864e5) fail(400, "future_date", "The visit date can't be in the future.");
    const [biz] = await db.select().from(B).where(eq(B.id, b.businessId)).limit(1);
    if (!biz) return notFound("Business not found");
    if (biz && (await db.select().from(schema.businessMembers).where(and(eq(schema.businessMembers.businessId, biz.id), eq(schema.businessMembers.userId, u.id)))).length)
      fail(400, "own_business", "You can't review a business you manage.");
    const svc = b.serviceId ? (await db.select().from(S).where(and(eq(S.id, b.serviceId), eq(S.businessId, biz!.id))))[0] : undefined;
    const title = b.title || `${svc?.name ?? "Visit"} at ${biz!.name}`;
    let status: "pending" | "published" = "pending", level = 0, publishedAt: Date | null = null;
    if (b.proofType === "firsthand_booking") {
      const [done] = await db.select({ id: BK.id }).from(BK).where(and(eq(BK.userId, u.id), eq(BK.businessId, biz!.id), eq(BK.status, "completed"))).limit(1);
      if (done) { status = "published"; level = 2; publishedAt = new Date(); }
    }
    const slug = `${slugify(title, 70)}-${shortId(5)}`;
    const res = await db.insert(E).values({
      slug, authorId: u.id, businessId: biz!.id, serviceId: svc?.id ?? null, title, story: b.story, pros: b.pros, cons: b.cons, suits: b.suits,
      parking: b.parking, access: b.access, pricePaid: b.pricePaid, whoFor: b.whoFor, ratingX10: Math.round(b.rating * 10), visitedOn: b.visitedOn,
      status, proofType: b.proofType, level, freeOrDiscounted: b.freeOrDiscounted, publishedAt,
    }).$returningId();
    const id = res[0]!.id;
    await audit(u.id, "experience", id, status === "published" ? "auto_verified_firsthand_booking" : "submitted", b.proofType);
    return { id, slug, status, level, needsEvidence: b.proofType === "receipt" };
  });

  app.post("/experiences/:id/evidence", async (req) => {
    const u = await requireUser(req);
    const id = Number((req.params as any).id);
    const [e] = await db.select().from(E).where(eq(E.id, id)).limit(1);
    if (!e || e.authorId !== u.id) return notFound();
    if (e.status !== "pending") fail(400, "not_pending", "This experience is no longer waiting for proof.");
    const file = await req.file({ limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
    if (!file) fail(400, "no_file", "Choose a file to upload.");
    const allowed: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
    const ext = allowed[file!.mimetype];
    if (!ext) fail(400, "bad_type", "Upload a JPG, PNG, WebP or PDF.");
    const dir = join(config.uploadDir, "evidence");
    mkdirSync(dir, { recursive: true });
    const name = `${id}-${shortId(10)}${ext ?? extname(file!.filename)}`;
    await pipeline(file!.file, createWriteStream(join(dir, name), { mode: 0o600 }));
    if (file!.file.truncated) fail(400, "too_big", "That file is over 5 MB.");
    await db.update(E).set({ evidencePath: `evidence/${name}` }).where(eq(E.id, id));
    await audit(u.id, "experience", id, "evidence_uploaded");
    return { ok: true };
  });

  app.get("/me/experiences", async (req) => {
    const u = await requireUser(req);
    const rows = await db.select({ e: E, b: B }).from(E).innerJoin(B, eq(B.id, E.businessId)).where(eq(E.authorId, u.id)).orderBy(desc(E.createdAt));
    return { items: rows.map(({ e, b }) => ({ id: e.id, slug: e.slug, title: e.title, status: e.status, level: e.level, proofType: e.proofType, rejectReason: e.rejectReason, hasEvidence: !!e.evidencePath, createdAt: e.createdAt, business: b.name })) };
  });

  app.get("/me/saved", async (req) => {
    const u = await requireUser(req);
    const ids = (await db.select({ id: schema.saves.experienceId }).from(schema.saves).where(eq(schema.saves.userId, u.id))).map((r) => r.id);
    const all = ids.length ? await listCards({ sort: "recent", limit: 200 }) : [];
    return { items: all.filter((c) => ids.includes(c.id)) };
  });

  /* ---------- bookings ---------- */
  app.post("/bookings", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req) => {
    const u = await requireUser(req);
    const b = z.object({ serviceId: z.number().int().positive(), slotAt: z.string().datetime(), experienceId: z.number().int().positive().optional() }).parse(req.body);
    const [svc] = await db.select({ s: S, b: B }).from(S).innerJoin(B, eq(B.id, S.businessId)).where(and(eq(S.id, b.serviceId), eq(S.active, true))).limit(1);
    if (!svc) return notFound("Service not found");
    const slotAt = new Date(b.slotAt);
    if (slotAt.getTime() < Date.now() + 30 * 6e4) fail(400, "slot_past", "Pick a time at least 30 minutes from now.");
    const clash = await db.select({ id: BK.id }).from(BK).where(and(eq(BK.businessId, svc!.b.id), eq(BK.slotAt, slotAt), sql`${BK.status} <> 'cancelled'`)).limit(1);
    if (clash.length) fail(409, "slot_taken", "That slot was just taken. Pick another time.");
    let recommenderId: number | null = null, experienceId: number | null = null;
    if (b.experienceId) {
      const [e] = await db.select().from(E).where(and(eq(E.id, b.experienceId), eq(E.status, "published"))).limit(1);
      if (e && e.businessId === svc!.b.id) {
        experienceId = e.id;
        // Self-referrals never earn.
        if (e.authorId !== u.id && e.level >= 2) recommenderId = e.authorId;
      }
    }
    let bookingId = 0, code = "";
    for (let i = 0; i < 5 && !bookingId; i++) {
      code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      try {
        const r = await db.insert(BK).values({ code, userId: u.id, businessId: svc!.b.id, serviceId: svc!.s.id, experienceId, recommenderId, slotAt, pricePaise: svc!.s.pricePaise }).$returningId();
        bookingId = r[0]!.id;
      } catch (err: any) { if (err?.code !== "ER_DUP_ENTRY" && err?.cause?.code !== "ER_DUP_ENTRY") throw err; }
    }
    if (!bookingId) fail(500, "code_failed", "Couldn't create the booking. Please try again.");
    if (recommenderId) {
      const platform = platformCommission(svc!.s.pricePaise, svc!.b.commissionBps);
      const amount = recommenderShare(platform);
      const r = await db.insert(C).values({ bookingId, recommenderId, platformPaise: platform, amountPaise: amount }).$returningId();
      await db.insert(schema.ledgerEntries).values({ commissionId: r[0]!.id, userId: recommenderId, toStatus: "estimated", amountPaise: amount, note: "Booking made from recommendation" });
    }
    await audit(u.id, "booking", bookingId, "booking_created");
    return { id: bookingId, code };
  });

  app.get("/me/bookings", async (req) => {
    const u = await requireUser(req);
    const rows = await db.select({ bk: BK, s: S, b: B, e: E }).from(BK).innerJoin(S, eq(S.id, BK.serviceId)).innerJoin(B, eq(B.id, BK.businessId))
      .leftJoin(E, eq(E.id, BK.experienceId)).where(eq(BK.userId, u.id)).orderBy(desc(BK.slotAt));
    const recs = await userMap(rows.map((r) => r.bk.recommenderId ?? 0));
    const reviewed = new Set((await db.select({ b: E.businessId }).from(E).where(eq(E.authorId, u.id))).map((r) => r.b));
    return {
      items: rows.map(({ bk, s, b, e }) => ({
        id: bk.id, code: bk.code, status: bk.status, slotAt: bk.slotAt, pricePaise: bk.pricePaise, completedAt: bk.completedAt, cancelledAt: bk.cancelledAt,
        service: s.name, business: { slug: b.slug, name: b.name, area: b.area, city: b.city },
        from: e ? { slug: e.slug, title: e.title } : null,
        recommender: bk.recommenderId ? recs.get(bk.recommenderId)?.name ?? null : null,
        accuracy: bk.accuracy, canRateAccuracy: bk.status === "completed" && !!bk.recommenderId && bk.accuracy === null,
        canCancel: bk.status === "confirmed" && bk.slotAt.getTime() > Date.now(),
        reviewed: reviewed.has(b.id),
      })),
    };
  });

  app.post("/bookings/:id/cancel", async (req) => {
    const u = await requireUser(req);
    const id = Number((req.params as any).id);
    const [bk] = await db.select().from(BK).where(and(eq(BK.id, id), eq(BK.userId, u.id))).limit(1);
    if (!bk) return notFound();
    if (bk.status !== "confirmed" || bk.slotAt.getTime() <= Date.now()) fail(400, "cannot_cancel", "This booking can't be cancelled any more.");
    await db.update(BK).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(BK.id, id));
    const [c] = await db.select().from(C).where(eq(C.bookingId, id)).limit(1);
    if (c && c.status === "estimated") await moveCommission(c, "reversed", "Booking cancelled");
    await audit(u.id, "booking", id, "booking_cancelled");
    return { ok: true };
  });

  /** "Did it match what this person said?" — the main input to the recommender's Trust Score. */
  app.post("/bookings/:id/accuracy", async (req) => {
    const u = await requireUser(req);
    const { answer } = z.object({ answer: z.enum(["yes", "mostly", "no"]) }).parse(req.body);
    const id = Number((req.params as any).id);
    const [bk] = await db.select().from(BK).where(and(eq(BK.id, id), eq(BK.userId, u.id))).limit(1);
    if (!bk) return notFound();
    if (bk.status !== "completed" || !bk.recommenderId || bk.accuracy !== null) fail(400, "cannot_rate", "This visit can't be rated.");
    await db.update(BK).set({ accuracy: { yes: 2, mostly: 1, no: 0 }[answer], accuracyAt: new Date() }).where(eq(BK.id, id));
    return { ok: true };
  });

  /* ---------- wallet ---------- */
  app.get("/me/wallet", async (req) => {
    const u = await requireUser(req);
    await releaseDue();
    const rows = await db.select({ c: C, bk: BK, s: S, b: B }).from(C).innerJoin(BK, eq(BK.id, C.bookingId)).innerJoin(S, eq(S.id, BK.serviceId)).innerJoin(B, eq(B.id, BK.businessId))
      .where(eq(C.recommenderId, u.id)).orderBy(desc(C.createdAt));
    const pays = await db.select().from(schema.payouts).where(eq(schema.payouts.userId, u.id)).orderBy(desc(schema.payouts.createdAt));
    const reach = await db.select({ n: sql<number>`count(*)`, done: sql<number>`sum(case when ${BK.status} = 'completed' then 1 else 0 end)` }).from(BK).where(eq(BK.recommenderId, u.id));
    return {
      totals: sumBy(rows.map((r) => r.c)),
      minPayoutPaise: config.minPayoutPaise, settleDays: config.settleDays, sharePct: config.recommenderShareBps / 100,
      items: rows.map(({ c, bk, s, b }) => ({ id: c.id, status: c.payoutId && c.status === "payable" ? "in_payout" : c.status, amountPaise: c.amountPaise, platformPaise: c.platformPaise, createdAt: c.createdAt, settleAfter: c.settleAfter, service: s.name, business: b.name, bookingStatus: bk.status })),
      payouts: pays,
      reach: { bookings: Number(reach[0]?.n ?? 0), completed: Number(reach[0]?.done ?? 0) },
    };
  });

  app.post("/me/payouts", async (req) => {
    const u = await requireUser(req);
    await releaseDue();
    const due = await db.select().from(C).where(and(eq(C.recommenderId, u.id), eq(C.status, "payable"), sql`${C.payoutId} is null`));
    const total = due.reduce((s, c) => s + c.amountPaise, 0);
    if (total < config.minPayoutPaise) fail(400, "below_minimum", `You need at least ₹${config.minPayoutPaise / 100} payable to withdraw.`);
    const r = await db.insert(schema.payouts).values({ userId: u.id, amountPaise: total }).$returningId();
    await db.update(C).set({ payoutId: r[0]!.id, updatedAt: new Date() }).where(inArray(C.id, due.map((c) => c.id)));
    await db.insert(schema.ledgerEntries).values({ payoutId: r[0]!.id, userId: u.id, fromStatus: "payable", toStatus: "payout_requested", amountPaise: total, note: "Payout requested" });
    await audit(u.id, "payout", r[0]!.id, "payout_requested");
    return { ok: true, amountPaise: total };
  });

  /* ---------- direct talk ---------- */
  app.get("/me/threads", async (req) => {
    const u = await requireUser(req);
    const T = schema.threads, M = schema.messages;
    const ts = await db.select().from(T).where(or(eq(T.userA, u.id), eq(T.userB, u.id))).orderBy(desc(T.lastAt));
    const others = await userMap(ts.map((t) => (t.userA === u.id ? t.userB : t.userA)));
    const out = [];
    for (const t of ts) {
      const [last] = await db.select().from(M).where(eq(M.threadId, t.id)).orderBy(desc(M.id)).limit(1);
      const unread = await db.select({ n: sql<number>`count(*)` }).from(M).where(and(eq(M.threadId, t.id), sql`${M.senderId} <> ${u.id}`, sql`${M.readAt} is null`));
      const o = others.get(t.userA === u.id ? t.userB : t.userA);
      out.push({ id: t.id, with: o ? { name: o.name, handle: o.handle, initials: initials(o.name) } : null, last: last?.body ?? "", lastAt: t.lastAt, unread: Number(unread[0]?.n ?? 0) });
    }
    return { items: out };
  });

  app.post("/threads", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req) => {
    const u = await requireUser(req);
    const b = z.object({ toUserId: z.number().int().positive(), body: z.string().trim().min(2).max(2000), experienceId: z.number().int().positive().optional() }).parse(req.body);
    if (b.toUserId === u.id) fail(400, "self", "You can't message yourself.");
    const [to] = await db.select().from(schema.users).where(eq(schema.users.id, b.toUserId)).limit(1);
    if (!to) return notFound("Member not found");
    const [a, z2] = [Math.min(u.id, to.id), Math.max(u.id, to.id)];
    let [t] = await db.select().from(schema.threads).where(and(eq(schema.threads.userA, a), eq(schema.threads.userB, z2))).limit(1);
    if (!t) {
      if (!to.openForQuestions) fail(403, "closed", `${to.name ?? "This member"} isn't taking direct questions right now. Ask on their post instead.`);
      const r = await db.insert(schema.threads).values({ userA: a, userB: z2, experienceId: b.experienceId ?? null }).$returningId();
      [t] = await db.select().from(schema.threads).where(eq(schema.threads.id, r[0]!.id));
    }
    const m = maskContacts(b.body);
    await db.insert(schema.messages).values({ threadId: t!.id, senderId: u.id, body: m.body, masked: m.masked });
    await db.update(schema.threads).set({ lastAt: new Date() }).where(eq(schema.threads.id, t!.id));
    return { threadId: t!.id, masked: m.masked };
  });

  app.get("/threads/:id", async (req) => {
    const u = await requireUser(req);
    const id = Number((req.params as any).id);
    const [t] = await db.select().from(schema.threads).where(eq(schema.threads.id, id)).limit(1);
    if (!t || (t.userA !== u.id && t.userB !== u.id)) return notFound();
    const msgs = await db.select().from(schema.messages).where(eq(schema.messages.threadId, id)).orderBy(asc(schema.messages.id));
    await db.update(schema.messages).set({ readAt: new Date() }).where(and(eq(schema.messages.threadId, id), sql`${schema.messages.senderId} <> ${u.id}`, sql`${schema.messages.readAt} is null`));
    const other = (await userMap([t.userA === u.id ? t.userB : t.userA])).get(t.userA === u.id ? t.userB : t.userA);
    return { id, with: other ? { id: other.id, name: other.name, handle: other.handle, initials: initials(other.name) } : null, messages: msgs.map((m) => ({ id: m.id, mine: m.senderId === u.id, body: m.body, masked: m.masked, createdAt: m.createdAt })) };
  });

  app.post("/threads/:id/messages", { config: { rateLimit: { max: 30, timeWindow: "10 minutes" } } }, async (req) => {
    const u = await requireUser(req);
    const id = Number((req.params as any).id);
    const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(req.body);
    const [t] = await db.select().from(schema.threads).where(eq(schema.threads.id, id)).limit(1);
    if (!t || (t.userA !== u.id && t.userB !== u.id)) return notFound();
    const m = maskContacts(body);
    await db.insert(schema.messages).values({ threadId: id, senderId: u.id, body: m.body, masked: m.masked });
    await db.update(schema.threads).set({ lastAt: new Date() }).where(eq(schema.threads.id, id));
    return { ok: true, masked: m.masked };
  });

}
