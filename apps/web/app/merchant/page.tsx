import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { api } from "@/lib/api";
import { ConfirmCode, Decision, ServiceForm, TextForm, Reveal, ActionButton } from "@/components/actions";
import { Stars, LevelBadge } from "@/components/ui";
import { inr, dateTime, date } from "@/lib/format";
export const metadata = { title: "Merchant portal" };
type D = { businesses: { id: number; name: string; slug: string }[]; dashboard: null | {
  business: { id: number; name: string; slug: string; city: string; area: string | null; commissionPct: number };
  kpis: { referred: number; completed: number; cancelled: number; total: number; owedPaise: number; owedVisits: number };
  upcoming: { id: number; slotAt: string; status: string; service: string; client: string; via: string }[];
  visitRequests: { id: number; title: string; author: string; visitedOn: string; createdAt: string }[];
  reviews: { id: number; slug: string; title: string; author: string; rating: number; level: number; quote: string; reply: string | null }[];
  services: { id: number; name: string; durationMin: number; pricePaise: number; active: boolean }[];
  statement: { bookingId: number; completedAt: string; service: string; pricePaise: number; commissionPaise: number }[];
} };
export default async function Merchant({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams;
  await requireUser("/merchant");
  const d = await api<D>(`/merchant${b ? `?b=${encodeURIComponent(b)}` : ""}`);
  if (!d.dashboard) return (
    <div className="wrap py-14 max-w-2xl flex flex-col gap-4"><h1 className="h-display text-4xl">Merchant portal</h1><p className="text-muted">Your account isn’t linked to a business yet. Once we’ve agreed your commission terms, we’ll link your email so you can confirm visits, manage services and reply to reviews.</p><Link href="/for-business#join" className="btn btn-primary self-start">List your business</Link></div>
  );
  const x = d.dashboard, biz = x.business;
  const STATUS: Record<string, string> = { confirmed: "bg-sand text-muted", completed: "bg-brand-soft text-brand-dark", cancelled: "bg-danger-soft text-danger" };
  const kpi = (l: string, v: string, n: string, cls = "card") => <div className={`${cls} rounded-2xl p-5`}><span className="text-[13px] font-semibold opacity-80">{l}</span><span className="block h-display text-[32px]">{v}</span><span className="text-[12.5px] opacity-75">{n}</span></div>;
  return (
    <div className="wrap py-8 pb-16 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><span className="text-sm text-muted">Firsthand for Business · {biz.area ? `${biz.area}, ` : ""}{biz.city}</span><h1 className="h-display text-[34px] leading-tight">{biz.name}</h1>
          {d.businesses.length > 1 && <nav aria-label="Switch business" className="flex flex-wrap gap-1.5 mt-2">{d.businesses.map((o) => <Link key={o.id} href={`/merchant?b=${o.id}`} className={`chip text-[13px] min-h-9 ${o.id === biz.id ? "chip-on" : ""}`}>{o.name}</Link>)}</nav>}</div>
        <ConfirmCode businessId={biz.id} />
      </div>
      <section aria-label="This month" className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        {kpi("Bookings this month", String(x.kpis.total), `${x.kpis.referred} came from reviews`)}
        {kpi("Visits confirmed", String(x.kpis.completed), `${x.kpis.cancelled} cancelled`)}
        {kpi("Commission rate", `${biz.commissionPct}%`, "on confirmed, referred visits only")}
        {kpi("Commission owed · this month", inr(x.kpis.owedPaise), `on ${x.kpis.owedVisits} confirmed referred visits`, "bg-brand-soft border border-[#BFDCD4] text-brand-dark")}
      </section>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px] items-start">
        <section className="card overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line-soft"><h2 className="text-lg font-semibold">Upcoming and today</h2><span className="text-sm text-muted">Ask the client for their 6-digit code</span></div>
          {x.upcoming.length === 0 ? <p className="p-6 text-muted">No upcoming Firsthand bookings.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[14.5px]"><thead><tr><th className="th">When</th><th className="th">Client &amp; service</th><th className="th">Came via</th><th className="th text-right">Visit</th></tr></thead><tbody>
              {x.upcoming.map((u) => <tr key={u.id} className="border-t border-line-soft"><td className="td font-semibold whitespace-nowrap">{dateTime(u.slotAt)}</td><td className="td">{u.client}<span className="block text-[13px] text-faint">{u.service}</span></td><td className="td text-[13.5px] text-muted">{u.via}</td><td className="td text-right"><span className={`pill ${STATUS[u.status]}`}>{u.status === "confirmed" ? "Upcoming" : u.status === "completed" ? "Confirmed" : "Cancelled"}</span></td></tr>)}
            </tbody></table></div>
          )}
          <p className="px-5 py-3.5 border-t border-line-soft text-[13px] text-faint">You’re only billed for visits you confirm.</p>
        </section>
        <section className="card p-5 flex flex-col gap-3.5"><h2 className="text-lg font-semibold">Visit confirmations</h2>
          {x.visitRequests.length === 0 ? <p className="text-sm text-muted">No requests waiting.</p> : x.visitRequests.map((r) => (
            <div key={r.id} className="rounded-xl border border-line-soft p-4 flex flex-col gap-2"><strong className="text-sm">{r.author} says they visited on {date(r.visitedOn)}</strong><span className="text-sm text-muted">{r.title}</span>
              <Decision path={`/merchant/${biz.id}/visit-requests/${r.id}`} needsReason={false} options={[{ value: "confirm", label: "Yes, they visited", cls: "btn-primary" }, { value: "decline", label: "Can’t confirm", cls: "btn-outline" }]} /></div>
          ))}
          <p className="text-[12.5px] text-faint">Confirming says the visit happened — not that you agree with the review. If you can’t confirm, the review goes to a moderator; it isn’t deleted.</p>
        </section>
      </div>
      <section className="card p-5 flex flex-col gap-3.5"><h2 className="text-lg font-semibold">Reviews</h2>
        <div className="grid gap-3 lg:grid-cols-2">{x.reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-line-soft p-4 flex flex-col gap-2"><div className="flex justify-between gap-2 text-sm"><Link href={`/e/${r.slug}`} className="font-semibold hover:text-brand">{r.author} · {r.title}</Link><Stars r={r.rating} /></div><div><LevelBadge level={r.level} /></div><p className="text-sm text-muted">“{r.quote}”</p>
            {r.reply ? <div className="rounded-lg bg-cream px-3 py-2 text-sm"><span className="block text-[12px] font-semibold text-muted">Your reply</span>{r.reply}</div>
              : <Reveal label="Reply publicly" className="btn btn-sm border border-brand text-brand bg-white self-start"><TextForm path={`/merchant/${biz.id}/reviews/${r.id}/reply`} label={`Reply as ${biz.name}`} button="Post reply" min={5} done="Reply posted under the review." /></Reveal>}</div>
        ))}</div>
        <p className="text-[12.5px] text-faint">Reviews can’t be edited or removed by businesses. Report one only if it breaks community rules.</p>
      </section>
      <div className="grid gap-5 xl:grid-cols-2 items-start">
        <section className="card p-5 flex flex-col gap-4"><h2 className="text-lg font-semibold">Services</h2>
          <ul className="flex flex-col">{x.services.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-t border-line-soft first:border-t-0"><span className={s.active ? "" : "text-faint line-through"}>{s.name} <span className="text-sm text-muted">· {s.durationMin} min · {inr(s.pricePaise)}</span></span>
            <ActionButton path={`/merchant/${biz.id}/services/${s.id}`} method="PATCH" body={{ active: !s.active }} label={s.active ? "Pause" : "Resume"} className="btn btn-ghost btn-sm" /></li>)}</ul>
          <ServiceForm businessId={biz.id} />
        </section>
        <section className="card overflow-hidden"><div className="px-5 py-4 border-b border-line-soft"><h2 className="text-lg font-semibold">Commission statement</h2><span className="text-sm text-muted">Confirmed visits that came from reviews</span></div>
          {x.statement.length === 0 ? <p className="p-5 text-muted text-sm">Nothing billable yet.</p> : (
            <div className="overflow-x-auto max-h-96"><table className="w-full text-sm"><thead><tr><th className="th">Date</th><th className="th">Service</th><th className="th text-right">Price</th><th className="th text-right">Commission</th></tr></thead><tbody>
              {x.statement.map((s) => <tr key={s.bookingId} className="border-t border-line-soft"><td className="td text-muted">{date(s.completedAt, { day: "numeric", month: "short" })}</td><td className="td">{s.service}</td><td className="td text-right tabular-nums">{inr(s.pricePaise)}</td><td className="td text-right tabular-nums">{inr(s.commissionPaise)}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </div>
    </div>
  );
}
