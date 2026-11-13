import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { api } from "@/lib/api";
import { dateTime, inr, date } from "@/lib/format";
import { AccuracyRater, ActionButton } from "@/components/actions";
import { Icon } from "@/components/icons";
export const metadata = { title: "My bookings" };
type B = { id: number; code: string; status: string; slotAt: string; pricePaise: number; completedAt: string | null; cancelledAt: string | null; service: string; business: { slug: string; name: string; area: string | null; city: string }; from: { slug: string; title: string } | null; recommender: string | null; accuracy: number | null; canRateAccuracy: boolean; canCancel: boolean; reviewed: boolean };
export default async function Bookings() {
  await requireUser("/me/bookings");
  const { items } = await api<{ items: B[] }>("/me/bookings");
  const upcoming = items.filter((b) => b.status === "confirmed"), done = items.filter((b) => b.status === "completed"), cancelled = items.filter((b) => b.status === "cancelled");
  return (
    <div className="wrap py-10 pb-16 flex flex-col gap-8">
      <div className="flex flex-col gap-1.5"><h1 className="h-display text-4xl">My bookings</h1><p className="text-muted">Show your check-in code at the counter so your visit is confirmed.</p></div>
      {items.length === 0 && <div className="card p-10 text-center text-muted">No bookings yet. <Link href="/explore" className="font-semibold text-brand">Find something verified</Link>.</div>}
      {upcoming.length > 0 && <section className="flex flex-col gap-4"><h2 className="h-display text-2xl">Upcoming</h2>{upcoming.map((b) => (
        <article key={b.id} className="card rounded-3xl p-6 grid gap-6 md:grid-cols-[1fr_auto] items-center">
          <div className="flex flex-col gap-3"><div className="flex flex-wrap gap-2"><span className="pill bg-brand-soft text-brand-dark">Confirmed</span><span className="pill bg-sand text-muted">Pay at the venue</span></div>
            <h3 className="text-xl font-semibold">{b.service} · <Link className="hover:text-brand" href={`/b/${b.business.slug}`}>{b.business.name}</Link></h3>
            <p className="text-muted text-[15px]">{dateTime(b.slotAt)} · {b.business.area ? `${b.business.area}, ` : ""}{b.business.city} · {inr(b.pricePaise)}</p>
            {b.from && <p className="text-sm text-muted">Booked from <Link className="font-semibold text-brand" href={`/e/${b.from.slug}`}>{b.recommender ? `${b.recommender}’s review` : b.from.title}</Link> · free cancellation before your slot</p>}
            {b.canCancel && <ActionButton path={`/bookings/${b.id}/cancel`} label="Cancel booking" className="btn btn-ghost btn-sm text-danger self-start" confirm="Cancel this booking? Nothing has been charged." done="Booking cancelled. The business has been told." />}
          </div>
          <div className="rounded-2xl bg-cream p-5 text-center"><span className="text-[13px] font-semibold text-muted">Check-in code</span><div className="h-display text-4xl tracking-[0.18em] py-1">{b.code.slice(0, 3)} {b.code.slice(3)}</div><span className="text-[12.5px] text-faint">Read it out or show this screen</span></div>
        </article>))}</section>}
      {done.length > 0 && <section className="flex flex-col gap-4"><h2 className="h-display text-2xl">Completed</h2>{done.map((b) => (
        <article key={b.id} className="card rounded-3xl p-6 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2"><span className="pill bg-brand-soft text-brand-dark"><Icon name="shield" className="w-3 h-3" />Visit confirmed</span><span className="pill bg-sand text-muted">{date(b.completedAt)}</span></div>
          <h3 className="text-xl font-semibold">{b.service} · <Link className="hover:text-brand" href={`/b/${b.business.slug}`}>{b.business.name}</Link></h3>
          {b.canRateAccuracy && b.recommender && <AccuracyRater bookingId={b.id} name={b.recommender} />}
          {b.accuracy !== null && <p className="text-sm text-muted">You told us {b.recommender}’s review {["didn’t match", "mostly matched", "matched"][b.accuracy]}. Thanks — it feeds their Trust Score.</p>}
          {!b.reviewed && <div className="rounded-2xl bg-cream p-5 flex flex-wrap items-center justify-between gap-4"><div><strong className="block">How was it, honestly?</strong><span className="text-sm text-muted">Your visit is already verified, so your review goes live straight away.</span></div><Link href="/share" className="btn btn-primary">Share your experience</Link></div>}
        </article>))}</section>}
      {cancelled.length > 0 && <section className="flex flex-col gap-3"><h2 className="h-display text-2xl">Cancelled</h2><ul className="card overflow-hidden">{cancelled.map((b) => <li key={b.id} className="px-5 py-3.5 border-t border-line-soft first:border-t-0 flex flex-wrap justify-between gap-2 text-[15px]"><span>{b.service} · {b.business.name}</span><span className="text-muted text-sm">{dateTime(b.slotAt)}</span></li>)}</ul></section>}
    </div>
  );
}
