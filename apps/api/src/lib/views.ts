import { and, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "./db.js";
import { trustFor, type Trust } from "./trust.js";
import { initials } from "./text.js";

const E = schema.experiences, B = schema.businesses, U = schema.users;

export type Author = { id: number; name: string; handle: string; initials: string; city: string | null; tier: Trust["tier"]; score: number | null };
export const authorView = (u: typeof U.$inferSelect, t?: Trust): Author => ({
  id: u.id, name: u.name ?? "Firsthand member", handle: u.handle ?? String(u.id), initials: initials(u.name), city: u.city,
  tier: t?.tier ?? "new", score: t?.score ?? null,
});

export type Card = ReturnType<typeof cardView>;
export function cardView(e: typeof E.$inferSelect, b: typeof B.$inferSelect, a: Author, helpful: number) {
  return {
    id: e.id, slug: e.slug, title: e.title, quote: e.story.length > 170 ? e.story.slice(0, 167).trimEnd() + "…" : e.story,
    rating: e.ratingX10 / 10, level: e.level, proofType: e.proofType, visitedOn: e.visitedOn, publishedAt: e.publishedAt,
    helpful, business: { id: b.id, slug: b.slug, name: b.name, category: b.category, city: b.city, area: b.area, isSample: b.isSample },
    author: a,
  };
}

export type ListFilter = { q?: string; cat?: string; city?: string; verified?: boolean; sort?: string; businessId?: number; authorId?: number; limit?: number };

/** Ranking: match, proof level, recency, helpfulness and the author's Trust Score — never commission. */
export async function listCards(f: ListFilter) {
  const where: SQL[] = [eq(E.status, "published")];
  if (f.q) { const p = `%${f.q.replace(/[%_]/g, "")}%`; where.push(or(like(E.title, p), like(E.story, p), like(B.name, p), like(B.area, p))!); }
  if (f.cat) where.push(eq(B.category, f.cat as any));
  if (f.city) where.push(eq(B.city, f.city));
  if (f.verified) where.push(sql`${E.level} >= 2`);
  if (f.businessId) where.push(eq(E.businessId, f.businessId));
  if (f.authorId) where.push(eq(E.authorId, f.authorId));
  const rows = await db.select({ e: E, b: B, u: U, helpful: sql<number>`(select count(*) from helpful_votes h where h.experience_id = ${E.id})` })
    .from(E).innerJoin(B, eq(B.id, E.businessId)).innerJoin(U, eq(U.id, E.authorId))
    .where(and(...where)).orderBy(desc(E.publishedAt)).limit(200);
  const trust = await trustFor(rows.map((r) => r.u.id));
  const cards = rows.map((r) => cardView(r.e, r.b, authorView(r.u, trust.get(r.u.id)), Number(r.helpful)));
  const now = Date.now();
  const rank = (c: Card) => {
    const ageDays = (now - new Date(c.publishedAt ?? now).getTime()) / 864e5;
    const trustPart = c.author.score === null ? 0.5 : c.author.score / 100;
    return 0.3 * trustPart + 0.25 * (c.level / 3) + 0.25 * Math.max(0, 1 - ageDays / 180) + 0.2 * Math.min(1, c.helpful / 10);
  };
  if (f.sort === "recent") { /* already newest first */ }
  else if (f.sort === "helpful") cards.sort((a, b) => b.helpful - a.helpful);
  else {
    cards.sort((a, b) => rank(b) - rank(a));
    // Keep a protected share of visibility for new profiles: every 5th slot goes to the best new-profile post.
    const fresh = cards.filter((c) => c.author.tier === "new");
    const rest = cards.filter((c) => c.author.tier !== "new");
    const mixed: Card[] = [];
    while (fresh.length || rest.length) {
      for (let i = 0; i < 4 && rest.length; i++) mixed.push(rest.shift()!);
      if (fresh.length) mixed.push(fresh.shift()!);
      if (!rest.length) mixed.push(...fresh.splice(0));
    }
    return mixed.slice(0, f.limit ?? 60);
  }
  return cards.slice(0, f.limit ?? 60);
}

export async function businessMap(ids: number[]) {
  if (!ids.length) return new Map<number, typeof B.$inferSelect>();
  const rows = await db.select().from(B).where(inArray(B.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
export async function userMap(ids: number[]) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map<number, typeof U.$inferSelect>();
  const rows = await db.select().from(U).where(inArray(U.id, uniq));
  return new Map(rows.map((r) => [r.id, r]));
}
