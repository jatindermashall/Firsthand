import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Card } from "@/lib/types";
import { Grid, SampleTag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CATEGORY, inr } from "@/lib/format";

type Data = {
  business: { id: number; slug: string; name: string; category: string; city: string; area: string | null; description: string | null; hoursText: string | null; isSample: boolean };
  services: { id: number; name: string; durationMin: number; pricePaise: number; unit: string | null; reviews: number }[];
  reviews: Card[];
  stats: { reviews: number; confirmed: number; recent: number; completedVisits: number; critical: number };
};
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await api<Data>(`/businesses/${slug}`, { allow404: true }).catch(() => null);
  return { title: d?.business?.name ?? "Business" };
}
const Bar = ({ label, n, of }: { label: string; n: number; of: number }) => (
  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm"><span className="text-muted">{label}</span><span className="font-semibold tabular-nums">{n}</span><div className="col-span-2 h-2 rounded-full bg-sand"><div className="h-2 rounded-full bg-brand" style={{ width: `${of ? Math.round((n / of) * 100) : 0}%` }} /></div></div>
);

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await api<Data>(`/businesses/${slug}`);
  const b = d.business, s = d.stats;
  const best = d.reviews.find((r) => r.level >= 2);
  return (
    <>
      <div className="bg-paper border-b border-line"><div className="wrap py-8 flex flex-col gap-5">
        <nav aria-label="Breadcrumb" className="text-sm text-faint flex gap-1.5"><Link className="hover:text-brand" href={`/explore?city=${b.city}`}>{b.city}</Link>/<Link className="hover:text-brand" href={`/explore?cat=${b.category}`}>{CATEGORY[b.category]}</Link></nav>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex flex-col gap-2"><h1 className="h-display text-4xl sm:text-[44px] leading-tight">{b.name}</h1>
            <p className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1"><span className="flex items-center gap-1.5"><Icon name="pin" />{b.area ? `${b.area}, ` : ""}{b.city}</span><span>{CATEGORY[b.category]}</span></p>
            {b.description && <p className="text-ink-2 max-w-2xl">{b.description}</p>}
            <div className="flex flex-wrap gap-2 pt-1">{b.isSample && <SampleTag />}<span className="badge bg-white border border-line text-muted">{s.completedVisits} visits confirmed on Firsthand</span></div></div>
          {best && <Link href={`/e/${best.slug}#book`} className="btn btn-primary">Book a service</Link>}
        </div>
      </div></div>
      <div className="wrap py-10 pb-16 grid gap-8 lg:grid-cols-[1fr_320px] items-start">
        <div className="flex flex-col gap-10 min-w-0">
          <section className="flex flex-col gap-4"><h2 className="h-display text-2xl">Services</h2>
            {d.services.length ? <ul className="card overflow-hidden">{d.services.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-line-soft first:border-t-0"><div><strong className="font-semibold">{x.name}</strong><span className="block text-[13.5px] text-muted">{x.unit ? x.unit : `${x.durationMin} min`}</span></div><span className="text-muted text-[15px]">{inr(x.pricePaise)}</span></li>
            ))}</ul> : <p className="text-muted">No bookable services yet.</p>}
            <p className="text-[13px] text-faint">Book from any review below — the booking panel shows real availability. Prices are set by the business.</p>
          </section>
          <section className="flex flex-col gap-4"><div className="flex flex-wrap items-end justify-between gap-3"><h2 className="h-display text-2xl">What verified visitors say</h2><span className="text-sm text-muted">{s.critical} critical {s.critical === 1 ? "review" : "reviews"} kept up because they’re genuine</span></div>
            <Grid items={d.reviews} empty="No verified reviews yet." />
          </section>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <div className="card p-5 flex flex-col gap-3"><h2 className="font-semibold">Proof behind the reviews</h2><Bar label="Visit confirmed" n={s.confirmed} of={s.reviews} /><Bar label="Receipt reviewed" n={s.reviews - s.confirmed} of={s.reviews} /><Bar label="In the last 90 days" n={s.recent} of={s.reviews} /></div>
          {b.hoursText && <div className="card p-5 text-sm"><h2 className="font-semibold text-base mb-1">Hours</h2><p className="text-muted">{b.hoursText}</p></div>}
          <div className="card p-5 flex flex-col gap-2 text-sm"><h2 className="font-semibold text-base">Is this your business?</h2><p className="text-muted">Confirm visits, manage services and reply to reviews.</p><Link href="/merchant" className="font-semibold text-brand">Open the merchant portal</Link></div>
        </aside>
      </div>
    </>
  );
}
