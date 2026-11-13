import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "./db.js";

/** Pilot defaults from the business plan's Profile Ratings section. Tune with pilot data. */
export const TRUST = {
  weights: { accuracy: 0.35, helpful: 0.2, evidence: 0.2, sessions: 0.15, responsive: 0.1 },
  minRatingsForScore: 3,
  trusted: { score: 70, ratings: 5 },
  top: { score: 85, ratings: 12 },
  upheldPenalty: 15,
};

export type Tier = "new" | "rising" | "trusted" | "top";
export type Trust = {
  score: number | null; tier: Tier;
  accuracyCount: number; accuracyMatched: number; helpfulVotes: number;
  published: number; confirmedShare: number; questions: number; answered: number; upheld: number;
};

const empty = (): Trust => ({ score: null, tier: "new", accuracyCount: 0, accuracyMatched: 0, helpfulVotes: 0, published: 0, confirmedShare: 0, questions: 0, answered: 0, upheld: 0 });

/** Trust Score: built only from people who acted on the advice. Never uses review sentiment, commission or followers. */
export async function trustFor(userIds: number[]): Promise<Map<number, Trust>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  const out = new Map<number, Trust>(ids.map((i) => [i, empty()]));
  if (!ids.length) return out;
  const B = schema.bookings, E = schema.experiences, H = schema.helpfulVotes, Q = schema.questions, A = schema.answers, R = schema.reports;

  const acc = await db.select({ u: B.recommenderId, n: sql<number>`count(*)`, pts: sql<number>`sum(${B.accuracy})` })
    .from(B).where(and(inArray(B.recommenderId, ids), isNotNull(B.accuracy))).groupBy(B.recommenderId);
  const pub = await db.select({ u: E.authorId, n: sql<number>`count(*)`, conf: sql<number>`sum(case when ${E.level} >= 2 then 1 else 0 end)` })
    .from(E).where(and(inArray(E.authorId, ids), eq(E.status, "published"))).groupBy(E.authorId);
  const help = await db.select({ u: E.authorId, n: sql<number>`count(*)` }).from(H).innerJoin(E, eq(E.id, H.experienceId))
    .where(and(inArray(E.authorId, ids), eq(E.status, "published"))).groupBy(E.authorId);
  const qs = await db.select({ u: E.authorId, n: sql<number>`count(distinct ${Q.id})`, ans: sql<number>`count(distinct case when ${A.authorId} = ${E.authorId} then ${Q.id} end)` })
    .from(Q).innerJoin(E, eq(E.id, Q.experienceId)).leftJoin(A, eq(A.questionId, Q.id))
    .where(inArray(E.authorId, ids)).groupBy(E.authorId);
  const up = await db.select({ u: E.authorId, n: sql<number>`count(*)` }).from(R).innerJoin(E, eq(E.id, R.experienceId))
    .where(and(inArray(E.authorId, ids), eq(R.status, "upheld"))).groupBy(E.authorId);

  for (const r of acc) { const t = out.get(r.u!)!; t.accuracyCount = Number(r.n); t.accuracyMatched = Number(r.pts); }
  for (const r of pub) { const t = out.get(r.u)!; t.published = Number(r.n); t.confirmedShare = Number(r.n) ? Number(r.conf) / Number(r.n) : 0; }
  for (const r of help) out.get(r.u)!.helpfulVotes = Number(r.n);
  for (const r of qs) { const t = out.get(r.u)!; t.questions = Number(r.n); t.answered = Number(r.ans); }
  for (const r of up) out.get(r.u)!.upheld = Number(r.n);

  for (const t of out.values()) {
    if (t.accuracyCount < TRUST.minRatingsForScore) { t.tier = "new"; continue; }
    const w = TRUST.weights;
    const accuracy = t.accuracyMatched / (2 * t.accuracyCount); // Yes = 2, Mostly = 1, No = 0
    const helpful = t.published ? Math.min(1, t.helpfulVotes / (3 * t.published)) : 0;
    const responsive = t.questions ? t.answered / t.questions : 0.5;
    // Paid Guide sessions are not live yet, so their weight is spread across the other signals.
    const raw = (w.accuracy * accuracy + w.helpful * helpful + w.evidence * t.confirmedShare + w.responsive * responsive) / (1 - w.sessions);
    t.score = Math.max(0, Math.min(100, Math.round(raw * 100) - t.upheld * TRUST.upheldPenalty));
    t.tier = t.score >= TRUST.top.score && t.accuracyCount >= TRUST.top.ratings && t.upheld === 0 ? "top"
      : t.score >= TRUST.trusted.score && t.accuracyCount >= TRUST.trusted.ratings ? "trusted" : "rising";
  }
  return out;
}
