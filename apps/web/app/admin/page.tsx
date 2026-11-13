import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { api } from "@/lib/api";
import { AdminElevate, Decision, ActionButton, AddBusiness, AddMember } from "@/components/actions";
import { inr, date, dateTime } from "@/lib/format";
export const metadata = { title: "Admin console" };
type O = {
  counts: { users: number; published: number; bookings: number; completed: number };
  queue: { id: number; slug: string; title: string; business: string; author: string; authorEmail: string; proofType: string; hasEvidence: boolean; visitedOn: string; createdAt: string; note: string | null; signals: string[] }[];
  reports: { id: number; reason: string; createdAt: string; experience: { slug: string; title: string } }[];
  leads: { id: number; businessName: string; category: string; city: string; contactName: string; phone: string; status: string; createdAt: string }[];
  payouts: { id: number; amountPaise: number; createdAt: string; user: string; email: string }[];
  commissions: { status: string; count: number; amountPaise: number }[];
  businesses: { id: number; name: string; slug: string; city: string; category: string; commissionPct: number; isSample: boolean; members: string[] }[];
  audit: { id: number; at: string; actor: string; entity: string; action: string; reason: string | null }[];
};
const PROOF: Record<string, string> = { business_confirm: "Business asked to confirm", receipt: "Receipt upload", firsthand_booking: "Firsthand booking" };
export default async function Admin() {
  const me = await requireUser("/admin");
  if (!me.isAdmin) return <div className="wrap py-14"><AdminElevate /></div>;
  const o = await api<O>("/admin/overview");
  const c = Object.fromEntries(o.commissions.map((x) => [x.status, x]));
  return (
    <div className="wrap py-8 pb-16 flex flex-col gap-8">
      <div><span className="text-sm text-muted">Trust, money and partners</span><h1 className="h-display text-[34px]">Admin console</h1></div>
      <section className="grid gap-3 grid-cols-2 xl:grid-cols-5">
        {[["Members", o.counts.users], ["Published experiences", o.counts.published], ["Bookings", o.counts.bookings], ["Visits confirmed", o.counts.completed], ["Waiting for review", o.queue.length]].map(([l, v]) => <div key={l} className="card rounded-2xl p-5"><span className="text-[13px] font-semibold text-muted">{l}</span><span className="block h-display text-[30px]">{v}</span></div>)}
      </section>

      <section className="flex flex-col gap-3"><h2 className="h-display text-2xl">Verification queue</h2>
        {o.queue.length === 0 ? <p className="text-muted">Nothing waiting.</p> : <div className="grid gap-4 lg:grid-cols-2">{o.queue.map((q) => (
          <article key={q.id} className="card p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/e/${q.slug}`} className="font-semibold hover:text-brand">{q.title}</Link><span className="block text-[13px] text-muted">{q.author} ({q.authorEmail}) · visited {date(q.visitedOn)} · submitted {dateTime(q.createdAt)}</span></div><span className="pill bg-amber-soft text-amber-ink">{PROOF[q.proofType]}</span></div>
            {q.note && <p className="text-sm text-amber-ink">{q.note}</p>}
            {q.signals.length > 0 && <ul className="flex flex-wrap gap-1.5">{q.signals.map((s) => <li key={s} className="pill bg-danger-soft text-danger">{s}</li>)}</ul>}
            {q.hasEvidence && <a href={`/api/admin/experiences/${q.id}/evidence`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm self-start">View receipt (access is logged)</a>}
            <Decision path={`/admin/experiences/${q.id}/decision`} levels options={[{ value: "approve", label: "Approve", cls: "btn-primary" }, { value: "reject", label: "Reject", cls: "btn-danger" }]} />
          </article>
        ))}</div>}
      </section>

      {o.reports.length > 0 && <section className="flex flex-col gap-3"><h2 className="h-display text-2xl">Reports</h2><div className="grid gap-4 lg:grid-cols-2">{o.reports.map((r) => (
        <article key={r.id} className="card p-5 flex flex-col gap-3"><Link href={`/e/${r.experience.slug}`} className="font-semibold hover:text-brand">{r.experience.title}</Link><p className="text-sm text-muted">“{r.reason}” · {dateTime(r.createdAt)}</p>
          <Decision path={`/admin/reports/${r.id}`} options={[{ value: "dismiss", label: "Dismiss — review stays", cls: "btn-outline" }, { value: "uphold", label: "Uphold — unpublish", cls: "btn-danger" }]} /></article>
      ))}</div></section>}

      <div className="grid gap-5 xl:grid-cols-2 items-start">
        <section className="card p-5 flex flex-col gap-3"><h2 className="text-lg font-semibold">Commissions</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">{["estimated", "pending_settlement", "payable", "paid", "reversed"].map((s) => <div key={s} className="rounded-xl bg-cream p-3"><dt className="text-muted capitalize">{s.replace("_", " ")}</dt><dd className="font-semibold">{inr(c[s]?.amountPaise ?? 0)} <span className="text-faint font-normal">· {c[s]?.count ?? 0}</span></dd></div>)}</dl>
          <ActionButton path="/admin/commissions/release-due" label="Release commissions past the refund window" className="btn btn-outline btn-sm self-start" />
          <h3 className="font-semibold mt-2">Payout requests</h3>
          {o.payouts.length === 0 ? <p className="text-sm text-muted">None waiting.</p> : o.payouts.map((p) => <div key={p.id} className="rounded-xl border border-line-soft p-4 flex flex-col gap-2"><span className="text-sm"><strong>{p.user}</strong> ({p.email}) · {inr(p.amountPaise)} · {date(p.createdAt)}</span>
            <Decision path={`/admin/payouts/${p.id}`} needsReason={false} options={[{ value: "paid", label: "Mark as paid", cls: "btn-primary" }, { value: "rejected", label: "Reject", cls: "btn-outline" }]} /></div>)}
        </section>
        <section className="card p-5 flex flex-col gap-3"><h2 className="text-lg font-semibold">Business leads</h2>
          {o.leads.length === 0 ? <p className="text-sm text-muted">No leads yet.</p> : <ul className="flex flex-col">{o.leads.map((l) => <li key={l.id} className="py-2.5 border-t border-line-soft first:border-t-0 flex flex-wrap items-center justify-between gap-2 text-sm"><span><strong>{l.businessName}</strong> · {l.category}, {l.city}<span className="block text-muted">{l.contactName} · {l.phone} · {date(l.createdAt)}</span></span>
            {l.status === "new" ? <ActionButton path={`/admin/leads/${l.id}`} body={{ status: "contacted" }} label="Mark contacted" className="btn btn-outline btn-sm" /> : <span className="pill bg-sand text-muted">{l.status}</span>}</li>)}</ul>}
        </section>
      </div>

      <section className="card p-5 flex flex-col gap-4"><h2 className="text-lg font-semibold">Businesses</h2>
        <AddBusiness />
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr><th className="th">Business</th><th className="th">Rate</th><th className="th">Owners</th><th className="th">Add owner</th></tr></thead><tbody>
          {o.businesses.map((b) => <tr key={b.id} className="border-t border-line-soft"><td className="td"><Link href={`/b/${b.slug}`} className="font-semibold hover:text-brand">{b.name}</Link><span className="block text-faint">{b.city}{b.isSample ? " · sample" : ""}</span></td><td className="td">{b.commissionPct}%</td><td className="td text-muted">{b.members.join(", ") || "—"}</td><td className="td"><AddMember businessId={b.id} /></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="card overflow-hidden"><div className="px-5 py-4 border-b border-line-soft flex justify-between"><h2 className="text-lg font-semibold">Audit log</h2><span className="text-[13px] text-faint">Append-only</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr><th className="th">When</th><th className="th">Who</th><th className="th">What</th><th className="th">Reason</th></tr></thead><tbody>
          {o.audit.map((a) => <tr key={a.id} className="border-t border-line-soft"><td className="td text-muted whitespace-nowrap">{dateTime(a.at)}</td><td className="td">{a.actor}</td><td className="td">{a.action.replaceAll("_", " ")} · <span className="text-faint">{a.entity}</span></td><td className="td text-muted">{a.reason ?? ""}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
