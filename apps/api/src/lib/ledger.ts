import { and, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "./db.js";

type Status = (typeof schema.commissions.$inferSelect)["status"];

/** Moves a commission forward and writes an append-only ledger line. */
export async function moveCommission(c: { id: number; recommenderId: number; amountPaise: number; status: Status }, to: Status, note: string, extra: Partial<typeof schema.commissions.$inferInsert> = {}) {
  await db.update(schema.commissions).set({ status: to, updatedAt: new Date(), ...extra }).where(eq(schema.commissions.id, c.id));
  await db.insert(schema.ledgerEntries).values({ commissionId: c.id, userId: c.recommenderId, fromStatus: c.status, toStatus: to, amountPaise: to === "reversed" ? -c.amountPaise : c.amountPaise, note });
}

/** Commissions whose refund window has closed become payable. Safe to call often. */
export async function releaseDue() {
  const due = await db.select().from(schema.commissions)
    .where(and(eq(schema.commissions.status, "pending_settlement"), lte(schema.commissions.settleAfter, new Date())));
  for (const c of due) await moveCommission(c, "payable", "Refund window closed");
  return due.length;
}

export const sumBy = (rows: { status: string; amountPaise: number; payoutId: number | null }[]) => {
  const t = { estimated: 0, pending_settlement: 0, payable: 0, in_payout: 0, paid: 0, reversed: 0 };
  for (const r of rows) {
    if (r.status === "payable" && r.payoutId) t.in_payout += r.amountPaise;
    else (t as any)[r.status] += r.amountPaise;
  }
  return t;
};
export { sql };
