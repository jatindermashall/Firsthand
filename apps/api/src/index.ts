import Fastify from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ZodError } from "zod";
import { config } from "./lib/config.js";
import { db, pool } from "./lib/db.js";
import { HttpError } from "./lib/http.js";
import { releaseDue } from "./lib/ledger.js";
import { seedIfEmpty } from "./db/seed.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import meRoutes from "./routes/me.js";
import businessRoutes from "./routes/business.js";

const here = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" }, trustProxy: true, bodyLimit: 256 * 1024 });
  await app.register(cookie);
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });
  await app.register(multipart);

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return reply.status(400).send({ error: { code: "invalid", message: first ? `${first.path.join(".") || "Input"}: ${first.message}` : "Check the form and try again.", issues: err.issues } });
    }
    if (err instanceof HttpError) return reply.status(err.status).send({ error: { code: err.code, message: err.message } });
    if (err.statusCode === 429) return reply.status(429).send({ error: { code: "rate_limited", message: "Too many requests. Please wait a moment." } });
    if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ error: { code: err.code ?? "bad_request", message: err.message } });
    req.log.error(err);
    return reply.status(500).send({ error: { code: "server_error", message: "Something went wrong on our side.", traceId: req.id } });
  });

  await app.register(authRoutes);
  await app.register(publicRoutes);
  await app.register(meRoutes);
  await app.register(businessRoutes);
  return app;
}

async function waitForDb(log: (m: string) => void) {
  for (let i = 1; i <= 30; i++) {
    try { await pool.query("select 1"); return; } catch (e: any) { log(`Waiting for database (${i}/30): ${e.code ?? e.message}`); await new Promise((r) => setTimeout(r, 2000)); }
  }
  throw new Error("Database not reachable");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = await buildApp();
  const log = (m: string) => app.log.info(m);
  await waitForDb(log);
  await migrate(db, { migrationsFolder: join(here, "..", "drizzle") });
  await seedIfEmpty(log);
  setInterval(() => releaseDue().catch((e) => app.log.error(e)), 10 * 60 * 1000).unref();
  await app.listen({ port: config.port, host: "0.0.0.0" });
}
