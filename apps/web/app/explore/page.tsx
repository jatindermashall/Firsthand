import Link from "next/link";
import { api } from "@/lib/api";
import type { Card } from "@/lib/types";
import { Grid, PageTitle } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CATEGORY } from "@/lib/format";

export const metadata = { title: "Explore verified experiences" };
type SP = { q?: string; cat?: string; city?: string; verified?: string; sort?: string };

export default async function Explore({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const { items, cities } = await api<{ items: Card[]; cities: string[] }>(`/experiences?${qs}`);
  const href = (patch: Partial<SP>) => { const n = new URLSearchParams(qs); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k); return `/explore?${n}`; };
  return (
    <div className="wrap py-8 pb-16 flex flex-col gap-6">
      <PageTitle title={sp.city ? `Verified experiences in ${sp.city}` : "Verified experiences"}>{items.length} {items.length === 1 ? "experience" : "experiences"} · ranked by match, proof level, recency and the reviewer’s Trust Score — never by commission.</PageTitle>
      <form className="card flex flex-wrap gap-2 p-2">
        <label className="flex-[2_1_240px] flex items-center gap-2.5 px-3"><Icon name="search" className="w-[18px] h-[18px] text-faint" /><span className="sr-only">Search</span><input name="q" type="search" defaultValue={sp.q} placeholder="Search a service, place or business" className="w-full min-h-11 outline-none bg-transparent placeholder:text-faint" /></label>
        <label className="flex-[1_1_150px] flex items-center gap-2 px-3 sm:border-l border-line"><Icon name="pin" className="w-[18px] h-[18px] text-faint" /><span className="sr-only">City</span>
          <select name="city" defaultValue={sp.city ?? ""} className="w-full min-h-11 bg-transparent outline-none"><option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}</select></label>
        {sp.cat && <input type="hidden" name="cat" value={sp.cat} />}{sp.verified && <input type="hidden" name="verified" value={sp.verified} />}
        <button className="btn btn-primary">Search</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Category" className="flex flex-wrap gap-2">
          <Link href={href({ cat: undefined })} aria-current={!sp.cat ? "page" : undefined} className={`chip ${!sp.cat ? "chip-on" : ""}`}>All</Link>
          {Object.entries(CATEGORY).map(([v, t]) => <Link key={v} href={href({ cat: v })} aria-current={sp.cat === v ? "page" : undefined} className={`chip ${sp.cat === v ? "chip-on" : ""}`}>{t}</Link>)}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href({ verified: sp.verified ? undefined : "1" })} className={`chip ${sp.verified ? "chip-on" : ""}`}><Icon name="shield" className="w-4 h-4 mr-1.5" />Visit-confirmed only</Link>
          {[["relevant", "Most relevant"], ["recent", "Newest"], ["helpful", "Most helpful"]].map(([v, t]) => <Link key={v} href={href({ sort: v === "relevant" ? undefined : v })} className={`chip ${(sp.sort ?? "relevant") === v ? "chip-on" : ""}`}>{t}</Link>)}
        </div>
      </div>
      <Grid items={items} empty={<div className="flex flex-col items-center gap-3"><strong className="text-lg text-ink">No verified experiences match yet</strong><p>Try another category or city, or be the first to share one.</p><Link href="/share" className="btn btn-primary">Share an experience</Link></div>} />
      <p className="text-[13px] text-faint">Sponsored placements, when we add them, will always be labelled and kept separate from these results.</p>
    </div>
  );
}
