import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Author, Card, Trust } from "@/lib/types";
import { Avatar, Disclosure, Grid, TierBadge } from "@/components/ui";
import { ToggleButton, CopyLink } from "@/components/actions";
import { StartThread } from "@/components/StartThread";
import { TIER, monthYear } from "@/lib/format";

type Data = {
  profile: Author & { bio: string | null; openForQuestions: boolean; joined: string; followers: number; trust: Trust };
  thresholds: { minRatingsForScore: number; trusted: { score: number; ratings: number }; top: { score: number; ratings: number } };
  experiences: Card[]; critical: number;
  answers: { question: string; answer: string; experience: { slug: string; title: string } }[];
  viewer: null | { id: number; isSelf: boolean; following: boolean };
};
export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const d = await api<Data>(`/users/${handle}`, { allow404: true }).catch(() => null);
  return { title: d?.profile ? `${d.profile.name}’s recommendations` : "Profile" };
}

export default async function Profile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const d = await api<Data>(`/users/${handle}`);
  const p = d.profile, t = p.trust, v = d.viewer;
  const pct = t.accuracyCount ? Math.round((t.accuracyMatched / (2 * t.accuracyCount)) * 100) : null;
  const next = t.tier === "new" ? `${Math.max(0, d.thresholds.minRatingsForScore - t.accuracyCount)} more visitor ratings to get a score`
    : t.tier === "rising" ? `Trusted at a score of ${d.thresholds.trusted.score}+ with ${d.thresholds.trusted.ratings}+ ratings`
    : t.tier === "trusted" ? `Top Guide at ${d.thresholds.top.score}+ with ${d.thresholds.top.ratings}+ ratings` : "Highest tier";
  return (
    <>
      <section className="bg-paper border-b border-line"><div className="wrap pt-10 pb-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-wrap items-center gap-5"><Avatar i={p.initials} size="w-24 h-24 text-[34px] font-display" />
            <div className="flex flex-col gap-1.5 max-w-xl"><div className="flex flex-wrap items-center gap-2.5"><h1 className="h-display text-4xl leading-tight">{p.name}</h1><TierBadge tier={p.tier} score={p.score} /></div>
              <span className="text-muted text-[15px]">@{p.handle}{p.city ? ` · ${p.city}` : ""} · on Firsthand since {monthYear(p.joined)}</span>
              {p.bio && <p className="text-ink-2 mt-1">{p.bio}</p>}</div></div>
          <div className="flex flex-wrap gap-2.5">
            {v?.isSelf ? <Link href="/me/settings" className="btn btn-outline">Edit profile</Link>
              : v ? <ToggleButton path={`/users/${p.id}/follow`} on={v.following} labelOn="Following" labelOff="Follow" className="btn btn-dark" /> : <Link href={`/signin?next=/u/${p.handle}`} className="btn btn-dark">Follow</Link>}
            {!v?.isSelf && p.openForQuestions && <StartThread toUserId={p.id} name={p.name} signedIn={!!v} />}
            <CopyLink path={`/u/${p.handle}`} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2.5 text-[14.5px]"><span><strong className="text-lg">{t.published}</strong> <span className="text-muted">verified experiences</span></span><span><strong className="text-lg">{d.critical}</strong> <span className="text-muted">critical reviews</span></span><span><strong className="text-lg">{t.answered}</strong> <span className="text-muted">questions answered</span></span><span><strong className="text-lg">{p.followers}</strong> <span className="text-muted">followers</span></span></div>
        <Disclosure>{p.name.split(" ")[0]} may earn a commission when you book through these recommendations. Businesses pay it; your price stays the same.</Disclosure>
      </div></section>
      <div className="wrap py-9 pb-16 grid gap-8 lg:grid-cols-[1fr_330px] items-start">
        <div className="flex flex-col gap-10 min-w-0">
          <section className="flex flex-col gap-5"><h2 className="h-display text-[26px]">Recommendations</h2><Grid items={d.experiences} empty="No published experiences yet." /></section>
          {d.answers.length > 0 && <section className="flex flex-col gap-4"><h2 className="h-display text-[26px]">Questions {p.name.split(" ")[0]} has answered</h2>
            {d.answers.map((x, i) => <div key={i} className="card p-5 flex flex-col gap-2"><Link href={`/e/${x.experience.slug}`} className="text-[13px] text-faint hover:text-brand">About {x.experience.title}</Link><p className="font-semibold">{x.question}</p><div className="rounded-xl bg-brand-soft px-4 py-3 text-[15px]">{x.answer}</div></div>)}</section>}
        </div>
        <aside id="trust" className="card p-6 flex flex-col gap-4 lg:sticky lg:top-24">
          <div><span className="eyebrow">Trust Score</span><div className="flex items-end gap-3 mt-1"><span className="h-display text-5xl">{p.score ?? "—"}</span><TierBadge tier={p.tier} /></div><p className="text-sm text-muted mt-1">{TIER[p.tier].help}.</p></div>
          <dl className="text-sm flex flex-col gap-2 border-t border-line-soft pt-4">
            <div className="flex justify-between gap-3"><dt className="text-muted">Visitors who said it matched</dt><dd className="font-semibold">{pct === null ? "—" : `${pct}% of ${t.accuracyCount}`}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Helpful votes</dt><dd className="font-semibold">{t.helpfulVotes}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Posts with a confirmed visit</dt><dd className="font-semibold">{Math.round(t.confirmedShare * 100)}%</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Questions answered</dt><dd className="font-semibold">{t.questions ? `${t.answered} of ${t.questions}` : "—"}</dd></div>
          </dl>
          <p className="text-[13px] text-faint border-t border-line-soft pt-3">{next}. Scores come only from people who acted on the advice — never from whether reviews are positive, followers or commission. <Link href="/trust#ratings" className="underline">How ratings work</Link></p>
        </aside>
      </div>
    </>
  );
}
