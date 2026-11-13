import Link from "next/link";
import type { Metadata } from "next";
import { api, getMe } from "@/lib/api";
import type { Author, Card, Trust } from "@/lib/types";
import { Avatar, Disclosure, Grid, LevelBadge, SampleTag, Stars, TierBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { BookingPanel } from "@/components/BookingPanel";
import { CopyLink, Reveal, TextForm, ToggleButton } from "@/components/actions";
import { StartThread } from "@/components/StartThread";
import { date, monthYear, ago, CATEGORY } from "@/lib/format";

type Data = {
  experience: Card & { story: string; serviceId: number | null; pros: string[]; cons: string[]; suits: string[]; parking: string | null; access: string | null; pricePaid: string | null; whoFor: string | null; freeOrDiscounted: boolean; status: string; rejectReason: string | null; businessReply: string | null; businessReplyAt: string | null };
  author: Author & { bio: string | null; openForQuestions: boolean; published: number; trust: Trust };
  business: { id: number; slug: string; name: string; category: string; city: string; area: string | null; hoursText: string | null; isSample: boolean };
  services: { id: number; name: string; durationMin: number; pricePaise: number; unit: string | null }[];
  questions: { id: number; body: string; createdAt: string; asker: string; answers: { id: number; body: string; createdAt: string; author: string; isAuthor: boolean }[] }[];
  others: Card[];
  viewer: null | { id: number; isAuthor: boolean; helpful: boolean; saved: boolean; following: boolean };
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await api<Data>(`/experiences/${slug}`, { allow404: true }).catch(() => null);
  return d?.experience ? { title: d.experience.title, description: d.experience.quote } : { title: "Experience" };
}

export default async function ExperiencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [d, me] = await Promise.all([api<Data>(`/experiences/${slug}`), getMe()]);
  const { experience: e, author: a, business: b, viewer: v } = d;
  const first = a.name.split(" ")[0];
  const accuracyLine = a.trust.accuracyCount ? `${Math.round((a.trust.accuracyMatched / (2 * a.trust.accuracyCount)) * 100)}% accurate across ${a.trust.accuracyCount} visitor ratings` : "no visitor ratings yet";
  return (
    <div className="wrap py-6 pb-16 flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-faint flex flex-wrap gap-1.5"><Link className="hover:text-brand" href={`/explore?city=${b.city}`}>{b.city}</Link>/<Link className="hover:text-brand" href={`/explore?cat=${b.category}`}>{CATEGORY[b.category]}</Link>/<Link className="hover:text-brand" href={`/b/${b.slug}`}>{b.name}</Link></nav>
      {e.status !== "published" && <p className="notice bg-amber-soft text-amber-ink border border-amber-line">Only you can see this. Status: <strong>{e.status === "pending" ? "waiting for verification" : "not published"}</strong>{e.rejectReason ? ` — ${e.rejectReason}` : ""}.</p>}
      {e.level >= 2 && <Disclosure><strong>Commission disclosure:</strong> {first} earns a share of Firsthand’s commission if you book through this review. The business pays it — your price doesn’t change.{e.freeOrDiscounted ? ` ${first} also received this free or at a discount.` : ""}</Disclosure>}
      <div className="grid gap-8 lg:grid-cols-[1fr_370px] items-start">
        <div className="flex flex-col gap-7 min-w-0">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2"><LevelBadge level={e.level} /><span className="badge bg-white border border-line text-muted">Visited {date(e.visitedOn)}</span>{b.isSample && <SampleTag />}</div>
            <h1 className="h-display text-3xl sm:text-[42px] leading-[1.08]">{e.title}</h1>
            <p className="text-muted text-[15px] flex flex-wrap gap-x-3 gap-y-1 items-center"><Link className="underline underline-offset-2 hover:text-brand" href={`/b/${b.slug}`}>{b.name}</Link><span>{b.area ? `${b.area}, ` : ""}{b.city}</span><Stars r={e.rating} /><span>from this visitor · {e.whoFor}</span></p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="ph sm:col-span-2 min-h-60 rounded-2xl flex items-end p-3"><span className="tag">Visitor photos coming soon</span></div>
            <div className="min-h-32 rounded-2xl bg-[#E9EEF0] flex items-end p-2.5"><span className="tag">Business photo</span></div>
          </div>

          <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
            <Link href={`/u/${a.handle}`} className="flex items-center gap-3"><Avatar i={a.initials} size="w-12 h-12 text-base" /><span className="flex flex-col leading-snug gap-1"><span className="flex flex-wrap items-center gap-2"><strong>{a.name}</strong><TierBadge tier={a.tier} score={a.score} /></span><span className="text-[13.5px] text-muted">{a.city ? `${a.city} · ` : ""}{a.published} verified experiences · {accuracyLine}</span></span></Link>
            <div className="flex flex-wrap gap-2">
              <Link href={`/u/${a.handle}`} className="btn btn-outline btn-sm">Storefront</Link>
              {!v?.isAuthor && (v ? <ToggleButton path={`/users/${a.id}/follow`} on={v.following} labelOn="Following" labelOff="Follow" className="btn btn-dark btn-sm" /> : <Link href={`/signin?next=/e/${e.slug}`} className="btn btn-dark btn-sm">Follow</Link>)}
              {!v?.isAuthor && a.openForQuestions && <StartThread toUserId={a.id} name={a.name} experienceId={e.id} signedIn={!!v} />}
            </div>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="h-display text-2xl">{first}’s experience</h2>
            <p className="text-[17px] text-ink-2 whitespace-pre-line">{e.story}</p>
            {(e.pros.length > 0 || e.cons.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {e.pros.length > 0 && <div className="card p-5"><h3 className="text-[15px] font-semibold text-brand-dark mb-2.5 flex items-center gap-2"><Icon name="check" />What was good</h3><ul className="list-disc pl-5 text-[15px] text-ink-2 flex flex-col gap-1.5">{e.pros.map((p) => <li key={p}>{p}</li>)}</ul></div>}
                {e.cons.length > 0 && <div className="card p-5"><h3 className="text-[15px] font-semibold text-[#8A3B12] mb-2.5 flex items-center gap-2"><Icon name="info" />What to watch for</h3><ul className="list-disc pl-5 text-[15px] text-ink-2 flex flex-col gap-1.5">{e.cons.map((p) => <li key={p}>{p}</li>)}</ul></div>}
              </div>
            )}
            {e.suits.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-muted">Suits:</span>{e.suits.map((s) => <span key={s} className="badge bg-white border border-line text-ink font-medium py-1.5 px-3">{s}</span>)}</div>}
            {(e.parking || e.access || e.pricePaid) && (
              <dl className="grid gap-2.5 sm:grid-cols-3 text-[14.5px]">
                {e.parking && <div className="rounded-xl bg-sand px-3.5 py-3"><dt className="text-[13px] font-semibold text-muted">Parking</dt><dd>{e.parking}</dd></div>}
                {e.access && <div className="rounded-xl bg-sand px-3.5 py-3"><dt className="text-[13px] font-semibold text-muted">Access</dt><dd>{e.access}</dd></div>}
                {e.pricePaid && <div className="rounded-xl bg-sand px-3.5 py-3"><dt className="text-[13px] font-semibold text-muted">Price paid</dt><dd>{e.pricePaid}</dd></div>}
              </dl>
            )}
            {e.status === "published" && (
              <div className="flex flex-wrap items-start gap-2.5 text-sm">
                {v && !v.isAuthor ? <ToggleButton path={`/experiences/${e.id}/helpful`} on={v.helpful} labelOn={`Marked helpful · ${e.helpful}`} labelOff={`Helpful · ${e.helpful}`} icon="thumb" /> : <span className="btn btn-outline btn-sm pointer-events-none"><Icon name="thumb" />{e.helpful} found helpful</span>}
                {v ? <ToggleButton path={`/experiences/${e.id}/save`} on={v.saved} labelOn="Saved" labelOff="Save" icon="bookmark" /> : <Link href={`/signin?next=/e/${e.slug}`} className="btn btn-outline btn-sm"><Icon name="bookmark" />Save</Link>}
                <CopyLink path={`/e/${e.slug}`} />
                {v && !v.isAuthor && <span className="ml-auto"><Reveal label="Report this review" className="text-[13.5px] text-faint underline min-h-9"><TextForm path={`/experiences/${e.id}/report`} field="reason" label="What’s wrong with this review?" button="Send report" min={5} done="Thanks — a moderator will look at it. Reports are reviewed by a person." /></Reveal></span>}
              </div>
            )}
          </section>

          {e.businessReply && <section className="card p-5 flex flex-col gap-2"><span className="text-[13px] font-semibold text-muted">Response from {b.name} · {ago(e.businessReplyAt)}</span><p className="text-[15px] text-ink-2">{e.businessReply}</p><span className="text-[12.5px] text-faint">Businesses can reply publicly. They can’t edit or remove reviews.</span></section>}

          {e.status === "published" && (
            <section className="flex flex-col gap-3.5">
              <h2 className="h-display text-2xl">Questions from people planning</h2>
              {v ? <Reveal label="Ask a question" className="btn btn-sm border border-brand text-brand bg-white self-start"><TextForm path={`/experiences/${e.id}/questions`} label={`Your question — ${first} and other verified visitors can answer`} placeholder="e.g. Do they do a strand test first?" button="Post question" min={5} done="Posted. You’ll see answers here." /></Reveal>
                : <Link href={`/signin?next=/e/${e.slug}`} className="btn btn-sm border border-brand text-brand bg-white self-start">Sign in to ask a question</Link>}
              {d.questions.length === 0 && <p className="text-muted text-sm">No questions yet.</p>}
              {d.questions.map((q) => (
                <div key={q.id} className="card p-5 flex flex-col gap-3">
                  <div><p className="font-semibold">{q.body}</p><span className="text-[12.5px] text-faint">{q.asker} · {ago(q.createdAt)}</span></div>
                  {q.answers.map((ans) => <div key={ans.id} className="rounded-xl bg-brand-soft px-4 py-3 text-[15px]"><span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-dark mb-0.5"><Icon name="shield" className="w-3.5 h-3.5" />{ans.author} · {ans.isAuthor ? "reviewer" : "verified visitor"}</span>{ans.body}</div>)}
                  {v && <Reveal label="Answer" className="btn btn-ghost btn-sm self-start"><TextForm path={`/questions/${q.id}/answers`} label="Your answer (only verified visitors to this place can answer)" button="Post answer" /></Reveal>}
                </div>
              ))}
            </section>
          )}
        </div>
        <div id="book" className="lg:sticky lg:top-24 scroll-mt-24 min-w-0">
          <BookingPanel defaultServiceId={e.serviceId ?? undefined} businessId={b.id} businessName={b.name} services={d.services} experienceId={e.status === "published" ? e.id : undefined} recommender={e.level >= 2 ? a.name : undefined} signedIn={!!me.user} isAuthor={v?.isAuthor} />
          {b.hoursText && <p className="text-[13px] text-faint mt-3 px-2">Hours: {b.hoursText}</p>}
        </div>
      </div>
      {d.others.length > 0 && <section className="flex flex-col gap-4 pt-4"><div className="flex items-end justify-between gap-3"><h2 className="h-display text-2xl">Other verified visits to {b.name}</h2><Link href={`/b/${b.slug}`} className="text-sm font-semibold text-brand">All reviews</Link></div><Grid items={d.others} /></section>}
      <p className="text-[12.5px] text-faint">Published {monthYear(e.publishedAt)}.</p>
    </div>
  );
}
