import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, inArray, like, lt, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db.js";
import { currentUser, requireUser } from "../lib/auth.js";
import { fail, notFound } from "../lib/http.js";
import { authorView, cardView, listCards, userMap } from "../lib/views.js";
import { trustFor, TRUST } from "../lib/trust.js";
import { lines } from "../lib/text.js";
import { config } from "../lib/config.js";
import { audit } from "../lib/audit.js";

const E = schema.experiences, B = schema.businesses, U = schema.users, S = schema.services;
const IST_OFFSET_MIN = 330;

export default async function publicRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    await db.execute(sql`select 1`);
    return { ok: true };
  });

  app.get("/home", async () => ({ featured: await listCards({ limit: 6 }) }));

  app.get("/experiences", async (req) => {
    const q = z.object({
      q: z.string().max(80).optional(), cat: z.enum(schema.CATEGORIES).optional(), city: z.string().max(60).optional(),
      verified: z.enum(["1", "0"]).optional(), sort: z.enum(["relevant", "recent", "helpful"]).optional(),
    }).parse(req.query);
    const items = await listCards({ ...q, verified: q.verified === "1" });
    const cities = await db.selectDistinct({ city: B.city }).from(B).orderBy(asc(B.city));
    return { items, cities: cities.map((c) => c.city) };
  });

  app.get("/experiences/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const viewer = await currentUser(req);
    const [row] = await db.select({ e: E, b: B, u: U }).from(E).innerJoin(B, eq(B.id, E.businessId)).innerJoin(U, eq(U.id, E.authorId))
      .where(eq(E.slug, slug)).limit(1);
    if (!row) return notFound("Experience not found");
    const { e, b, u } = row;
    const isAuthor = viewer?.id === e.authorId;
    if (e.status !== "published" && !isAuthor && !viewer?.isAdmin) return notFound("Experience not found");
    const trust = (await trustFor([u.id])).get(u.id)!;
    const helpful = await db.select({ n: sql<number>`count(*)` }).from(schema.helpfulVotes).where(eq(schema.helpfulVotes.experienceId, e.id));
    const svcs = await db.select().from(S).where(and(eq(S.businessId, b.id), eq(S.active, true))).orderBy(asc(S.pricePaise));
    const qs = await db.select().from(schema.questions).where(eq(schema.questions.experienceId, e.id)).orderBy(desc(schema.questions.createdAt));
    const ans = qs.length ? await db.select().from(schema.answers).where(inArray(schema.answers.questionId, qs.map((q) => q.id))).orderBy(asc(schema.answers.createdAt)) : [];
    const people = await userMap([...qs.map((q) => q.askerId), ...ans.map((a) => a.authorId)]);
    const others = (await listCards({ businessId: b.id, limit: 7 })).filter((c) => c.id !== e.id).slice(0, 3);
    let flags = { helpful: false, saved: false, following: false };
    if (viewer) {
      const [h] = await db.select().from(schema.helpfulVotes).where(and(eq(schema.helpfulVotes.experienceId, e.id), eq(schema.helpfulVotes.userId, viewer.id))).limit(1);
      const [s] = await db.select().from(schema.saves).where(and(eq(schema.saves.experienceId, e.id), eq(schema.saves.userId, viewer.id))).limit(1);
      const [f] = await db.select().from(schema.follows).where(and(eq(schema.follows.followerId, viewer.id), eq(schema.follows.followeeId, u.id))).limit(1);
      flags = { helpful: !!h, saved: !!s, following: !!f };
    }
    const authorStats = await db.select({ n: sql<number>`count(*)` }).from(E).where(and(eq(E.authorId, u.id), eq(E.status, "published")));
    return {
      experience: {
        ...cardView(e, b, authorView(u, trust), Number(helpful[0]?.n ?? 0)),
        story: e.story, serviceId: e.serviceId, pros: lines(e.pros), cons: lines(e.cons), suits: (e.suits ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        parking: e.parking, access: e.access, pricePaid: e.pricePaid, whoFor: e.whoFor, freeOrDiscounted: e.freeOrDiscounted,
        status: e.status, rejectReason: isAuthor || viewer?.isAdmin ? e.rejectReason : null,
        businessReply: e.businessReply, businessReplyAt: e.businessReplyAt,
      },
      author: { ...authorView(u, trust), bio: u.bio, openForQuestions: u.openForQuestions, published: Number(authorStats[0]?.n ?? 0), trust },
      business: { id: b.id, slug: b.slug, name: b.name, category: b.category, city: b.city, area: b.area, hoursText: b.hoursText, isSample: b.isSample },
      services: svcs.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, pricePaise: s.pricePaise, unit: s.unit })),
      questions: qs.map((q) => ({
        id: q.id, body: q.body, createdAt: q.createdAt, asker: people.get(q.askerId)?.name ?? "Member",
        answers: ans.filter((a) => a.questionId === q.id).map((a) => ({ id: a.id, body: a.body, createdAt: a.createdAt, author: people.get(a.authorId)?.name ?? "Member", isAuthor: a.authorId === e.authorId })),
      })),
      others,
      viewer: viewer ? { id: viewer.id, isAuthor, ...flags } : null,
    };
  });

  app.get("/businesses", async (req) => {
    const { q } = z.object({ q: z.string().max(80).optional() }).parse(req.query);
    const where = q ? or(like(B.name, `%${q}%`), like(B.area, `%${q}%`), like(B.city, `%${q}%`)) : undefined;
    const rows = await db.select().from(B).where(where).orderBy(asc(B.name)).limit(20);
    const svcs = rows.length ? await db.select().from(S).where(and(inArray(S.businessId, rows.map((r) => r.id)), eq(S.active, true))) : [];
    return { items: rows.map((b) => ({ id: b.id, slug: b.slug, name: b.name, city: b.city, area: b.area, category: b.category, services: svcs.filter((s) => s.businessId === b.id).map((s) => ({ id: s.id, name: s.name })) })) };
  });

  app.get("/businesses/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const [b] = await db.select().from(B).where(eq(B.slug, slug)).limit(1);
    if (!b) return notFound("Business not found");
    const svcs = await db.select().from(S).where(and(eq(S.businessId, b.id), eq(S.active, true))).orderBy(asc(S.pricePaise));
    const cards = await listCards({ businessId: b.id, sort: "recent", limit: 50 });
    const visits = await db.select({ n: sql<number>`count(*)` }).from(schema.bookings).where(and(eq(schema.bookings.businessId, b.id), eq(schema.bookings.status, "completed")));
    const ninety = Date.now() - 90 * 864e5;
    return {
      business: { ...b, commissionBps: undefined },
      services: svcs.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, pricePaise: s.pricePaise, unit: s.unit, reviews: cards.filter((c) => c.title.toLowerCase().includes(s.name.toLowerCase().split(" ")[0]!)).length })),
      reviews: cards,
      stats: {
        reviews: cards.length,
        confirmed: cards.filter((c) => c.level >= 2).length,
        recent: cards.filter((c) => new Date(c.publishedAt ?? 0).getTime() > ninety).length,
        completedVisits: Number(visits[0]?.n ?? 0),
        critical: cards.filter((c) => c.rating <= 3).length,
      },
    };
  });

  app.get("/businesses/:id/slots", async (req) => {
    const { id } = req.params as { id: string };
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
    const [b] = await db.select().from(B).where(eq(B.id, Number(id))).limit(1);
    if (!b) return notFound("Business not found");
    const dayStart = istToUtc(date, 0), dayEnd = istToUtc(date, 24);
    const taken = await db.select({ at: schema.bookings.slotAt }).from(schema.bookings)
      .where(and(eq(schema.bookings.businessId, b.id), ne(schema.bookings.status, "cancelled"), gte(schema.bookings.slotAt, dayStart), lt(schema.bookings.slotAt, dayEnd)));
    const takenSet = new Set(taken.map((t) => t.at.getTime()));
    const slots = [];
    for (let h = b.openHour; h < b.closeHour; h++) {
      const at = istToUtc(date, h);
      slots.push({ at: at.toISOString(), label: `${String(h).padStart(2, "0")}:00`, available: !takenSet.has(at.getTime()) && at.getTime() > Date.now() + 30 * 6e4 });
    }
    return { slots };
  });

  app.get("/users/:handle", async (req) => {
    const { handle } = req.params as { handle: string };
    const viewer = await currentUser(req);
    const [u] = await db.select().from(U).where(eq(U.handle, handle)).limit(1);
    if (!u) return notFound("Profile not found");
    const trust = (await trustFor([u.id])).get(u.id)!;
    const cards = await listCards({ authorId: u.id, sort: "recent", limit: 100 });
    const answered = await db.select({ q: schema.questions, a: schema.answers, e: E }).from(schema.answers)
      .innerJoin(schema.questions, eq(schema.questions.id, schema.answers.questionId)).innerJoin(E, eq(E.id, schema.questions.experienceId))
      .where(eq(schema.answers.authorId, u.id)).orderBy(desc(schema.answers.createdAt)).limit(20);
    const followers = await db.select({ n: sql<number>`count(*)` }).from(schema.follows).where(eq(schema.follows.followeeId, u.id));
    let following = false;
    if (viewer) following = !!(await db.select().from(schema.follows).where(and(eq(schema.follows.followerId, viewer.id), eq(schema.follows.followeeId, u.id))).limit(1))[0];
    return {
      profile: { ...authorView(u, trust), bio: u.bio, openForQuestions: u.openForQuestions, joined: u.createdAt, followers: Number(followers[0]?.n ?? 0), trust },
      thresholds: TRUST,
      experiences: cards,
      critical: cards.filter((c) => c.rating <= 3).length,
      answers: answered.map((r) => ({ question: r.q.body, answer: r.a.body, experience: { slug: r.e.slug, title: r.e.title } })),
      viewer: viewer ? { id: viewer.id, isSelf: viewer.id === u.id, following } : null,
    };
  });

  /* ---------- actions on experiences ---------- */
  const toggle = (table: typeof schema.helpfulVotes | typeof schema.saves, action: string) => async (req: any) => {
    const u = await requireUser(req);
    const id = Number(req.params.id);
    const [e] = await db.select().from(E).where(and(eq(E.id, id), eq(E.status, "published"))).limit(1);
    if (!e) return notFound();
    if (table === schema.helpfulVotes && e.authorId === u.id) fail(400, "own_post", "You can't vote on your own post.");
    const where = and(eq(table.experienceId, id), eq(table.userId, u.id));
    const [has] = await db.select().from(table).where(where).limit(1);
    if (has) await db.delete(table).where(where); else await db.insert(table).values({ experienceId: id, userId: u.id });
    return { on: !has, action };
  };
  app.post("/experiences/:id/helpful", toggle(schema.helpfulVotes, "helpful"));
  app.post("/experiences/:id/save", toggle(schema.saves, "save"));

  app.post("/experiences/:id/report", async (req) => {
    const u = await requireUser(req);
    const { reason } = z.object({ reason: z.string().trim().min(5).max(400) }).parse(req.body);
    const id = Number((req.params as any).id);
    const [e] = await db.select({ id: E.id }).from(E).where(eq(E.id, id)).limit(1);
    if (!e) return notFound();
    const r = await db.insert(schema.reports).values({ experienceId: id, reporterId: u.id, reason }).$returningId();
    await audit(u.id, "report", r[0]!.id, "report_created");
    return { ok: true };
  });

  app.post("/experiences/:id/questions", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req) => {
    const u = await requireUser(req);
    const { body } = z.object({ body: z.string().trim().min(5).max(600) }).parse(req.body);
    const id = Number((req.params as any).id);
    const [e] = await db.select({ id: E.id }).from(E).where(and(eq(E.id, id), eq(E.status, "published"))).limit(1);
    if (!e) return notFound();
    await db.insert(schema.questions).values({ experienceId: id, askerId: u.id, body });
    return { ok: true };
  });

  /** Only the author, or someone with their own published experience at the same business, can answer. */
  app.post("/questions/:id/answers", async (req) => {
    const u = await requireUser(req);
    const { body } = z.object({ body: z.string().trim().min(2).max(1000) }).parse(req.body);
    const qid = Number((req.params as any).id);
    const [row] = await db.select({ q: schema.questions, e: E }).from(schema.questions).innerJoin(E, eq(E.id, schema.questions.experienceId)).where(eq(schema.questions.id, qid)).limit(1);
    if (!row) return notFound();
    if (row.e.authorId !== u.id) {
      const [mine] = await db.select({ id: E.id }).from(E).where(and(eq(E.authorId, u.id), eq(E.businessId, row.e.businessId), eq(E.status, "published"))).limit(1);
      if (!mine) fail(403, "not_verified_visitor", "Only verified visitors to this place can answer.");
    }
    await db.insert(schema.answers).values({ questionId: qid, authorId: u.id, body });
    return { ok: true };
  });

  app.post("/users/:id/follow", async (req) => {
    const u = await requireUser(req);
    const id = Number((req.params as any).id);
    if (id === u.id) fail(400, "self", "You can't follow yourself.");
    const where = and(eq(schema.follows.followerId, u.id), eq(schema.follows.followeeId, id));
    const [has] = await db.select().from(schema.follows).where(where).limit(1);
    if (has) await db.delete(schema.follows).where(where); else await db.insert(schema.follows).values({ followerId: u.id, followeeId: id });
    return { on: !has };
  });

  app.post("/leads", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (req) => {
    const b = z.object({
      businessName: z.string().trim().min(2).max(120), category: z.string().trim().min(2).max(60), city: z.string().trim().min(2).max(60),
      contactName: z.string().trim().min(2).max(80), phone: z.string().trim().regex(/^[+\d][\d\s-]{7,20}$/, "Enter a valid phone number"),
    }).parse(req.body);
    await db.insert(schema.leads).values(b);
    return { ok: true };
  });

  app.get("/config", async () => ({ otpPreview: config.otpPreview, recommenderSharePct: config.recommenderShareBps / 100, settleDays: config.settleDays, minPayoutPaise: config.minPayoutPaise, trust: TRUST }));
}

/** IST wall-clock date + hour → UTC Date. */
export function istToUtc(date: string, hour: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hour, 0) - IST_OFFSET_MIN * 6e4);
}
