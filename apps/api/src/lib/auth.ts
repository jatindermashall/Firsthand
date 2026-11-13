import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "./db.js";
import { config } from "./config.js";
import { fail } from "./http.js";

export const COOKIE = "fh_session";
const SESSION_DAYS = 30;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const hashOtp = (email: string, code: string) => sha(`${email.toLowerCase()}:${code}`);

export type SessionUser = typeof schema.users.$inferSelect & { isAdmin: boolean; businessIds: number[] };

export async function createSession(reply: FastifyReply, userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(schema.sessions).values({ tokenHash: sha(token), userId, expiresAt });
  reply.setCookie(COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", secure: config.cookieSecure, expires: expiresAt });
}

export async function destroySession(req: FastifyRequest, reply: FastifyReply) {
  const t = req.cookies[COOKIE];
  if (t) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha(t)));
  reply.clearCookie(COOKIE, { path: "/" });
}

export async function currentUser(req: FastifyRequest): Promise<SessionUser | null> {
  if ((req as any)._user !== undefined) return (req as any)._user;
  const t = req.cookies[COOKIE];
  let out: SessionUser | null = null;
  if (t) {
    const rows = await db.select({ u: schema.users, s: schema.sessions }).from(schema.sessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
      .where(and(eq(schema.sessions.tokenHash, sha(t)), gt(schema.sessions.expiresAt, new Date()))).limit(1);
    if (rows[0]) {
      const mem = await db.select({ b: schema.businessMembers.businessId }).from(schema.businessMembers).where(eq(schema.businessMembers.userId, rows[0].u.id));
      out = { ...rows[0].u, isAdmin: !!rows[0].s.adminUntil && rows[0].s.adminUntil > new Date(), businessIds: mem.map((m) => m.b) };
    }
  }
  (req as any)._user = out;
  return out;
}

export async function requireUser(req: FastifyRequest) {
  const u = await currentUser(req);
  if (!u) fail(401, "unauthenticated", "Please sign in first.");
  return u!;
}
export async function requireAdmin(req: FastifyRequest) {
  const u = await requireUser(req);
  if (!u.isAdmin) fail(403, "forbidden", "Admin access needed.");
  return u;
}
export async function requireMember(req: FastifyRequest, businessId: number) {
  const u = await requireUser(req);
  if (!u.isAdmin && !u.businessIds.includes(businessId)) fail(403, "forbidden", "You don't manage this business.");
  return u;
}

/** Admin elevation is per session and time-limited; it never comes from sign-in codes. */
export async function elevate(req: FastifyRequest, key: string) {
  const u = await requireUser(req);
  const a = Buffer.from(sha(key)), b = Buffer.from(sha(config.adminAccessKey));
  if (!config.adminAccessKey || config.adminAccessKey.length < 16 || !timingSafeEqual(a, b)) fail(403, "bad_key", "That access key isn't valid.");
  await db.update(schema.sessions).set({ adminUntil: new Date(Date.now() + 12 * 36e5) }).where(eq(schema.sessions.tokenHash, sha(req.cookies[COOKIE]!)));
  return u;
}
