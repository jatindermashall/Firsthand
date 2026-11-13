import { db, schema } from "./db.js";
export const audit = (actorId: number | null, entityType: string, entityId: number | null, action: string, reason?: string | null) =>
  db.insert(schema.auditEvents).values({ actorId, entityType, entityId, action, reason: reason ?? null });
