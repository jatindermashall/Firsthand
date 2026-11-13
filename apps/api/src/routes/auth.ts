import type { FastifyInstance } from "fastify";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db.js";
import { config } from "../lib/config.js";
import { createSession, currentUser, destroySession, elevate, hashOtp, newOtp, requireUser } from "../lib/auth.js";
import { fail } from "../lib/http.js";
import { sendCode } from "../lib/mail.js";
import { initials, slugify, shortId } from "../lib/text.js";
import { audit } from "../lib/audit.js";

const Email = z.string().trim().toLowerCase().email().max(191);

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/request-code", { config: { rateLimit: { max: 8, timeWindow: "10 minutes" } } }, async (req) => {
    const { email } = z.object({ email: Email }).parse(req.body);
    const recent = await db.select({ n: sql<number>`count(*)` }).from(schema.otpCodes)
      .where(and(eq(schema.otpCodes.email, email), gt(schema.otpCodes.createdAt, new Date(Date.now() - 36e5))));
    if (Number(recent[0]?.n ?? 0) >= 5) fail(429, "too_many_codes", "Too many codes requested. Try again in an hour.");
    const code = newOtp();
    await db.insert(schema.otpCodes).values({ email, codeHash: hashOtp(email, code), expiresAt: new Date(Date.now() + 10 * 6e4) });
    const sent = await sendCode(email, code).catch(() => false);
    if (!sent && !config.otpPreview) fail(503, "mail_unavailable", "We couldn't send the code. Please try again shortly.");
    return { sent, previewCode: sent ? undefined : code };
  });

  app.post("/auth/verify", { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const { email, code } = z.object({ email: Email, code: z.string().trim().regex(/^\d{6}$/) }).parse(req.body);
    const [otp] = await db.select().from(schema.otpCodes)
      .where(and(eq(schema.otpCodes.email, email), isNull(schema.otpCodes.usedAt), gt(schema.otpCodes.expiresAt, new Date())))
      .orderBy(desc(schema.otpCodes.id)).limit(1);
    if (!otp || otp.attempts >= 5) fail(400, "code_expired", "That code has expired. Ask for a new one.");
    if (otp!.codeHash !== hashOtp(email, code)) {
      await db.update(schema.otpCodes).set({ attempts: otp!.attempts + 1 }).where(eq(schema.otpCodes.id, otp!.id));
      fail(400, "code_wrong", "That code isn't right. Check it and try again.");
    }
    await db.update(schema.otpCodes).set({ usedAt: new Date() }).where(eq(schema.otpCodes.id, otp!.id));
    let [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    let isNew = false;
    if (!user) {
      const res = await db.insert(schema.users).values({ email }).$returningId();
      [user] = await db.select().from(schema.users).where(eq(schema.users.id, res[0]!.id));
      isNew = true;
    }
    await createSession(reply, user!.id);
    return { ok: true, needsProfile: isNew || !user!.name || !user!.handle };
  });

  app.post("/auth/logout", async (req, reply) => { await destroySession(req, reply); return { ok: true }; });

  app.get("/me", async (req) => {
    const u = await currentUser(req);
    if (!u) return { user: null, otpPreview: config.otpPreview };
    const unread = await db.select({ n: sql<number>`count(*)` }).from(schema.messages)
      .innerJoin(schema.threads, eq(schema.threads.id, schema.messages.threadId))
      .where(sql`(${schema.threads.userA} = ${u.id} or ${schema.threads.userB} = ${u.id}) and ${schema.messages.senderId} <> ${u.id} and ${schema.messages.readAt} is null`);
    return {
      otpPreview: config.otpPreview,
      user: { id: u.id, email: u.email, name: u.name, handle: u.handle, city: u.city, bio: u.bio, openForQuestions: u.openForQuestions, initials: initials(u.name), isAdmin: u.isAdmin, businessIds: u.businessIds, unread: Number(unread[0]?.n ?? 0) },
    };
  });

  app.patch("/me", async (req) => {
    const u = await requireUser(req);
    const body = z.object({
      name: z.string().trim().min(2).max(80).optional(),
      handle: z.string().trim().toLowerCase().regex(/^[a-z0-9._]{3,30}$/, "Use 3–30 letters, numbers, dots or underscores").optional(),
      city: z.string().trim().max(60).optional(),
      bio: z.string().trim().max(400).optional(),
      openForQuestions: z.boolean().optional(),
    }).parse(req.body);
    if (body.handle && body.handle !== u.handle) {
      const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, body.handle)).limit(1);
      if (taken) fail(409, "handle_taken", "That handle is taken. Try another.");
    }
    if (!u.handle && !body.handle && body.name) body.handle = `${slugify(body.name, 20).replace(/-/g, ".")}.${shortId(3)}`;
    await db.update(schema.users).set(body).where(eq(schema.users.id, u.id));
    return { ok: true };
  });

  app.post("/admin/elevate", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (req) => {
    const { key } = z.object({ key: z.string().min(1).max(200) }).parse(req.body);
    const u = await elevate(req, key);
    await audit(u.id, "user", u.id, "admin_elevated");
    return { ok: true };
  });
}
