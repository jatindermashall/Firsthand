import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { api } from "@/lib/api";
import { inr, date } from "@/lib/format";
import { ActionButton } from "@/components/actions";
export const metadata = { title: "Earnings" };
type W = { totals: Record<"estimated" | "pending_settlement" | "payable" | "in_payout" | "paid" | "reversed", number>; minPayoutPaise: number; settleDays: number; sharePct: number;
  items: { id: number; status: string; amountPaise: number; platformPaise: number; createdAt: string; settleAfter: string | null; service: string; business: string; bookingStatus: string }[];
  payouts: { id: number; amountPaise: number; status: string; reference: string | null; createdAt: string; paidAt: string | null }[]; reach: { bookings: number; completed: number } };
const STATUS: Record<string, [string, string]> = { estimated: ["Estimated", "bg-sand text-muted"], pending_settlement: ["Pending settlement", "bg-amber-soft text-amber-ink"], payable: ["Payable", "bg-brand-soft text-brand-dark"], in_payout: ["In payout", "bg-brand-soft text-brand-dark"], paid: ["Paid", "bg-ink text-white"], reversed: ["Reversed", "bg-danger-soft text-danger"] };
export default async function Wallet() {
  await requireUser("/me/wallet");
  const w = await api<W>("/me/wallet");
  const t = w.totals;
  const tile = (label: string, v: number, note: string, cls = "card") => <div className={`${cls} rounded-2xl p-5 flex flex-col gap-1`}><span className="text-[13px] font-semibold opacity-80">{label}</span><span className="h-display text-[28px]">{inr(v)}</span><span className="text-[12.5px] opacity-75">{note}</span></div>;
  return (
    <div className="wrap py-10 pb-16 flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-col gap-1.5"><h1 className="h-display text-4xl">Earnings</h1><p className="text-muted max-w-2xl">You earn {w.sharePct}% of what the business pays Firsthand when someone completes a booking from your review. It becomes payable {w.settleDays} days after the visit is confirmed. Until then it’s pending — not cash.</p></div><Link href="/trust" className="font-semibold text-brand text-[15px]">How earnings work</Link></div>
      <section aria-label="Earnings by status" className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {tile("Estimated", t.estimated, "Upcoming bookings")}
        {tile("Pending settlement", t.pending_settlement, "Refund window open", "bg-amber-soft border border-amber-line text-amber-ink")}
        {tile("Payable now", t.payable, "Ready to withdraw", "bg-brand text-white")}
        {tile("In payout", t.in_payout, "Requested, on its way")}
        {tile("Paid to date", t.paid, `${w.payouts.filter((p) => p.status === "paid").length} payouts`)}
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <section className="card overflow-hidden min-w-0">
          <div className="px-5 py-4 border-b border-line-soft flex flex-wrap justify-between gap-2"><h2 className="text-lg font-semibold">Statement</h2><span className="text-sm text-muted">{w.reach.bookings} bookings from your reviews · {w.reach.completed} completed</span></div>
          {w.items.length === 0 ? <p className="p-6 text-muted">No earnings yet. When someone books from one of your visit-confirmed reviews, it shows up here.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-[14.5px]"><thead><tr><th className="th">Date</th><th className="th">Booking</th><th className="th">Status</th><th className="th text-right">Your share</th></tr></thead><tbody>
              {w.items.map((i) => <tr key={i.id} className="border-t border-line-soft"><td className="td text-muted whitespace-nowrap">{date(i.createdAt, { day: "numeric", month: "short" })}</td><td className="td"><strong className="font-semibold">{i.service}</strong><span className="block text-[13px] text-faint">{i.business} · platform commission {inr(i.platformPaise)}{i.status === "pending_settlement" && i.settleAfter ? ` · payable from ${date(i.settleAfter, { day: "numeric", month: "short" })}` : ""}</span></td><td className="td"><span className={`pill ${STATUS[i.status]?.[1]}`}>{STATUS[i.status]?.[0]}</span></td><td className={`td text-right tabular-nums ${i.status === "reversed" ? "text-danger line-through" : ""}`}>{inr(i.amountPaise)}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
        <aside className="flex flex-col gap-4">
          <div className="card p-6 flex flex-col gap-3.5"><h2 className="text-lg font-semibold">Withdraw</h2>
            <div className="flex items-baseline justify-between"><span className="text-muted text-[14.5px]">Payable now</span><span className="h-display text-3xl">{inr(t.payable)}</span></div>
            {t.payable >= w.minPayoutPaise ? <ActionButton path="/me/payouts" label="Request payout" className="btn btn-primary min-h-12 w-full" done="Payout requested. It’ll show here with a reference once it’s sent." />
              : <p className="text-sm text-muted">You can withdraw once {inr(w.minPayoutPaise)} is payable.</p>}
            <span className="text-[12.5px] text-faint">Tax deducted at source (TDS), if applicable, is shown on each payout. Bank details and KYC are collected before your first payout.</span></div>
          {w.payouts.length > 0 && <div className="card p-5 flex flex-col gap-2 text-sm"><h3 className="font-semibold text-base">Payouts</h3>{w.payouts.map((p) => <div key={p.id} className="flex justify-between gap-2"><span className="text-muted">{date(p.createdAt, { day: "numeric", month: "short" })} · {p.reference ?? (p.status === "requested" ? "Requested" : p.status)}</span><span className="font-semibold">{inr(p.amountPaise)}</span></div>)}</div>}
        </aside>
      </div>
    </div>
  );
}
