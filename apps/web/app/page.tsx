import Link from "next/link";
import { api } from "@/lib/api";
import type { Card } from "@/lib/types";
import { Grid, LevelBadge, Stars, Avatar, TierBadge } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function Home() {
  const { featured } = await api<{ featured: Card[] }>("/home");
  const hero = featured.find((c) => c.level >= 2) ?? featured[0];
  const check = <Icon name="check" className="w-5 h-5 text-brand mt-0.5" />;
  return (
    <>
      <section className="wrap grid gap-14 lg:grid-cols-2 items-center py-14 lg:py-20">
        <div className="flex flex-col gap-6">
          <span className="self-start rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand">Now in Chandigarh · Mohali · Ludhiana · Manali · Kasauli</span>
          <h1 className="h-display text-[40px] sm:text-5xl lg:text-[62px] leading-[1.03]">Recommendations only from people who’ve actually been there.</h1>
          <p className="text-lg text-muted max-w-xl">Every review on Firsthand is tied to a completed visit. Find salons, stays and experiences through people you trust — and earn when your honest recommendation leads to a booking.</p>
          <form action="/explore" className="card flex flex-wrap gap-2 p-2 shadow-[0_8px_28px_rgba(16,41,43,0.08)] max-w-xl">
            <label className="flex-[2_1_220px] flex flex-col px-3 py-1.5"><span className="text-xs font-semibold text-muted">What are you planning?</span><input name="q" type="search" placeholder="Hair spa, weekend homestay, paragliding…" className="outline-none bg-transparent py-0.5 placeholder:text-faint" /></label>
            <label className="flex-[1_1_130px] flex flex-col px-3 py-1.5 sm:border-l border-line"><span className="text-xs font-semibold text-muted">Where</span>
              <select name="city" className="outline-none bg-transparent py-0.5"><option value="">Anywhere</option>{["Chandigarh", "Mohali", "Ludhiana", "Manali", "Kasauli"].map((c) => <option key={c}>{c}</option>)}</select></label>
            <button className="btn btn-primary min-h-[52px]"><Icon name="search" className="w-[18px] h-[18px]" />Search</button>
          </form>
          <div className="flex flex-wrap gap-2 text-sm">{[["salon", "Salons & spas"], ["stay", "Stays"], ["wellness", "Wellness"], ["activity", "Activities"], ["food", "Restaurant packages"]].map(([v, t]) => <Link key={v} href={`/explore?cat=${v}`} className="chip">{t}</Link>)}</div>
        </div>
        {hero && (
          <Link href={`/e/${hero.slug}`} className="card rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(16,41,43,0.14)] w-full max-w-md mx-auto block hover:-translate-y-0.5 transition">
            <div className="ph ph-b h-56 flex items-end justify-between p-3.5"><span className="tag">Visitor photo</span><span className="rounded-md bg-ink px-2.5 py-1 text-xs font-semibold text-white">Visited {new Date(hero.visitedOn).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span></div>
            <div className="p-6 flex flex-col gap-3">
              <div><LevelBadge level={hero.level} /></div>
              <h2 className="h-display text-[22px] leading-tight">{hero.title}</h2>
              <p className="text-muted text-[15px]">“{hero.quote}”</p>
              <div className="flex items-center justify-between gap-3 pt-1"><div className="flex items-center gap-2.5"><Avatar i={hero.author.initials} /><div className="flex flex-col leading-tight gap-1"><span className="font-semibold text-sm">{hero.author.name}</span><TierBadge tier={hero.author.tier} /></div></div><Stars r={hero.rating} /></div>
              <p className="text-[12.5px] text-faint border-t border-line-soft pt-3">Disclosure: {hero.author.name.split(" ")[0]} earns a share of the commission if you book through this recommendation. The business pays it — your price is the same.</p>
            </div>
          </Link>
        )}
      </section>

      <section className="bg-paper border-y border-line">
        <div className="wrap py-16 flex flex-col gap-9">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl flex flex-col gap-2.5"><span className="eyebrow">How verification works</span><h2 className="h-display text-3xl sm:text-[40px] leading-[1.1]">Every badge says exactly what we checked.</h2></div>
            <p className="max-w-md text-muted">A badge confirms the visit happened. It never means the business paid for a good review — critical reviews stay up when they’re genuine. <Link className="font-semibold text-brand" href="/trust">Read the full guide</Link></p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-cream p-6 flex flex-col gap-3"><div><LevelBadge level={1} /></div><h3 className="text-lg font-semibold">A booking or invoice existed</h3><p className="text-muted text-[15px]">We checked a receipt privately. It proves a purchase, not that the visit happened — so these posts don’t earn commission.</p></div>
            <div className="rounded-2xl bg-brand-soft p-6 flex flex-col gap-3"><div><span className="badge bg-brand text-white"><Icon name="shield" className="w-3.5 h-3.5" />Visit confirmed by the business</span></div><h3 className="text-lg font-semibold">The service was completed</h3><p className="text-muted text-[15px]">The business confirmed you showed up, with a one-time check-in code at the counter.</p></div>
            <div className="rounded-2xl bg-ink text-[#F3EFE6] p-6 flex flex-col gap-3"><div><span className="badge bg-[#F3EFE6] text-ink"><Icon name="shield" className="w-3.5 h-3.5" />Stay confirmed by the booking partner</span></div><h3 className="text-lg font-semibold">The partner system confirmed it</h3><p className="text-[#C9D3D0] text-[15px]">For hotels and tours booked through a partner, their system reports the stay as completed.</p></div>
          </div>
        </div>
      </section>

      <section className="wrap py-16 flex flex-col gap-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-col gap-2"><span className="eyebrow">Ranked by trust, never by commission</span><h2 className="h-display text-3xl sm:text-4xl">Recently verified experiences</h2></div><Link href="/explore" className="btn border border-ink text-ink hover:bg-ink hover:text-white">See all</Link></div>
        <Grid items={featured} />
      </section>

      <section className="bg-paper border-y border-line">
        <div className="wrap py-20 grid gap-12 lg:grid-cols-2 items-center">
          <div className="flex flex-col gap-5">
            <span className="eyebrow">For everyone, not just influencers</span>
            <h2 className="h-display text-4xl sm:text-5xl leading-[1.05]">Been there? Prove it. Recommend it. Earn from it.</h2>
            <p className="text-muted text-[17px] max-w-lg">Your honest experience helps the next person decide. When they book through it and the visit is completed, you get a share of what the business pays us.</p>
            <ul className="flex flex-col gap-2.5 text-[15.5px]"><li className="flex gap-2.5">{check}No follower minimum, no sign-up fees</li><li className="flex gap-2.5">{check}Critical reviews earn exactly like positive ones</li><li className="flex gap-2.5">{check}Your Trust Score grows when visitors say your advice matched reality</li></ul>
            <div className="flex flex-wrap gap-3 pt-1"><Link href="/share" className="btn btn-primary min-h-12">Share your first experience</Link><Link href="/trust#ratings" className="btn btn-ghost min-h-12">How profiles are rated</Link></div>
          </div>
          <ol className="flex flex-col gap-3">
            {[["Share a verified experience", "Upload a receipt privately or ask the business to confirm — we only show the badge, never the document."], ["Someone books through it", "From your post, your storefront or a link you share on WhatsApp."], ["You earn once the visit is complete", "It moves from pending to payable after the refund window. Withdraw from ₹500."]].map(([t, d], i) => (
              <li key={t} className="card p-5 grid grid-cols-[44px_1fr] gap-4"><span className={`w-11 h-11 rounded-xl ${i === 2 ? "bg-amber-soft text-[#8A5206]" : "bg-brand-soft text-brand"} h-display text-xl flex items-center justify-center`}>{i + 1}</span><div><strong className="block">{t}</strong><span className="text-muted text-[14.5px]">{d}</span></div></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ink text-[#F3EFE6]">
        <div className="wrap py-16 grid gap-10 lg:grid-cols-2 items-center">
          <div className="flex flex-col gap-4"><span className="eyebrow !text-[#7FD1C3]">For salons, spas, stays and tour operators</span><h2 className="h-display text-3xl sm:text-[42px] leading-[1.08]">Pay only for new customers who actually show up.</h2><p className="text-[#C9D3D0] text-[17px] max-w-xl">Your happy customers become accountable recommenders. You pay the agreed commission only on completed, attributed bookings — confirmed at your counter with a code.</p>
            <div className="flex flex-wrap gap-3 pt-2"><Link href="/for-business" className="btn bg-[#F3EFE6] text-ink min-h-12 hover:bg-white">List your business</Link><Link href="/merchant" className="btn text-[#F3EFE6] min-h-12 hover:bg-[#1D3D3F]">Merchant portal</Link></div></div>
          <div className="grid gap-3 sm:grid-cols-2">{[["No upfront ad spend", "Commission on completed visits only."], ["Code check-in", "Confirm a visit in seconds."], ["Clear statements", "See every booking you’re billed for."], ["Reply publicly", "Respond to reviews — no paid removals."]].map(([t, d]) => <div key={t} className="rounded-2xl border border-[#2E4A4C] p-5"><strong className="block">{t}</strong><span className="text-[#C9D3D0] text-[14.5px]">{d}</span></div>)}</div>
        </div>
      </section>
    </>
  );
}
