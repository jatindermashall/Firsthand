import Link from "next/link";
import { api } from "@/lib/api";
import { LevelBadge } from "@/components/ui";
import { Icon } from "@/components/icons";

export const metadata = { title: "How verification works" };
type Cfg = { recommenderSharePct: number; settleDays: number; minPayoutPaise: number; trust: { weights: Record<string, number>; minRatingsForScore: number; trusted: { score: number; ratings: number }; top: { score: number; ratings: number } } };
const Faq = ({ q, a }: { q: string; a: string }) => (
  <details className="card px-5 group"><summary className="flex items-center justify-between gap-4 py-4 font-semibold cursor-pointer list-none">{q}<span className="text-brand text-xl leading-none group-open:rotate-45 transition">+</span></summary><p className="pb-5 text-muted text-[15px] max-w-3xl">{a}</p></details>
);

export default async function Trust() {
  const c = await api<Cfg>("/config");
  const w = c.trust.weights;
  const ok = <Icon name="check" className="w-5 h-5 text-brand mt-0.5" />, no = <Icon name="x" className="w-5 h-5 text-danger mt-0.5" />;
  return (
    <>
      <section className="bg-paper border-b border-line"><div className="wrap py-14 lg:py-20 flex flex-col gap-5 max-w-4xl"><span className="eyebrow">Trust &amp; verification guide</span><h1 className="h-display text-4xl sm:text-[56px] leading-[1.05]">A badge proves the visit happened. Nothing more, nothing less.</h1><p className="text-lg text-muted max-w-2xl">We check that a reviewer really went. We don’t vouch that the place is good — the reviewer does that, in their own words, good or bad.</p></div></section>
      <section className="wrap py-14 flex flex-col gap-6"><h2 className="h-display text-3xl">What each badge means</h2>
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[15px]"><thead className="bg-cream"><tr><th className="th">Badge</th><th className="th">What we checked</th><th className="th">Can it earn commission?</th></tr></thead><tbody>
          {[[3, "The hotel or tour partner’s system reported the stay as completed.", "Yes"], [2, "The business confirmed the visit with a one-time check-in code, or confirmed the reviewer’s visit request.", "Yes"], [1, "A moderator privately checked a receipt or invoice. Shows a purchase, not a completed visit.", "No"]].map(([l, t, e]) => <tr key={l as number} className="border-t border-line-soft"><td className="td"><LevelBadge level={l as number} /></td><td className="td text-muted">{t}</td><td className={`td font-semibold ${e === "Yes" ? "text-brand-dark" : "text-muted"}`}>{e}</td></tr>)}
        </tbody></table></div></div>
      </section>
      <section id="ratings" className="bg-paper border-y border-line scroll-mt-20"><div className="wrap py-14 grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4"><span className="eyebrow">Profile ratings</span><h2 className="h-display text-3xl">The most accurate people get seen first.</h2><p className="text-muted">Every recommender gets a Trust Score built only from people who acted on their advice. After a booked visit, the visitor answers one question: <strong className="text-ink">“Did it match what this person said?”</strong> An honest critic whose warnings proved right ranks above someone who praises everything.</p>
          <ul className="flex flex-col gap-2.5 text-[15px]"><li className="flex gap-2.5">{ok}Accuracy after visits — {Math.round(w.accuracy! * 100)}%</li><li className="flex gap-2.5">{ok}Helpful votes from readers — {Math.round(w.helpful! * 100)}%</li><li className="flex gap-2.5">{ok}Share of posts with a confirmed visit — {Math.round(w.evidence! * 100)}%</li><li className="flex gap-2.5">{ok}Answering questions — {Math.round(w.responsive! * 100)}%</li><li className="flex gap-2.5 text-muted">{ok}Paid Guide sessions — {Math.round(w.sessions! * 100)}% (when they launch)</li></ul></div>
        <div className="flex flex-col gap-3">
          {[["Top Guide", `Score ${c.trust.top.score}+ and ${c.trust.top.ratings}+ visitor ratings, no upheld complaints`], ["Trusted", `Score ${c.trust.trusted.score}+ and ${c.trust.trusted.ratings}+ visitor ratings`], ["Rising", `${c.trust.minRatingsForScore}+ visitor ratings — score shown`], ["New", `Fewer than ${c.trust.minRatingsForScore} ratings — no score yet, and a protected share of visibility`]].map(([t, d]) => <div key={t} className="card p-4"><strong>{t}</strong><p className="text-sm text-muted">{d}</p></div>)}
          <p className="text-[13px] text-faint">Never counted: whether reviews are positive, follower count, commission, or anything a business pays for. These thresholds are pilot defaults and will be tuned.</p>
        </div>
      </div></section>
      <section className="wrap py-14 grid gap-5 lg:grid-cols-2">
        <div className="card p-7 flex flex-col gap-4"><h2 className="h-display text-2xl">What we promise</h2><ul className="flex flex-col gap-3 text-[15.5px]">{["Critical reviews stay up when they’re genuine", "Every commission connection is disclosed on the review", "Receipts are private and never shown publicly", "A person reviews every appeal and report", "Phone numbers and emails are hidden in direct messages"].map((t) => <li key={t} className="flex gap-2.5">{ok}{t}</li>)}</ul></div>
        <div className="card p-7 flex flex-col gap-4"><h2 className="h-display text-2xl">What we never do</h2><ul className="flex flex-col gap-3 text-[15.5px]">{["Pay anyone for a positive review", "Let a business buy the removal of a review", "Rank results by how much commission a business pays", "Pay for recruiting other members", "Show fake countdowns or pressure you to post"].map((t) => <li key={t} className="flex gap-2.5">{no}{t}</li>)}</ul></div>
      </section>
      <section className="wrap pb-16 flex flex-col gap-5"><h2 className="h-display text-3xl">Common questions</h2>
        <div className="flex flex-col gap-2.5">
          <Faq q="Do I pay more if I book through a recommendation?" a="No. The business pays the commission out of its own margin. The price you see is the business’s price." />
          <Faq q="How much does a recommender earn?" a={`${c.recommenderSharePct}% of what the business pays Firsthand on that booking — a share of the platform’s commission, never a share of the booking price.`} />
          <Faq q="When does a commission become real money?" a={`After the visit is confirmed and the ${c.settleDays}-day refund window closes. Until then it’s shown as estimated or pending, never as cash. You can withdraw from ₹${c.minPayoutPaise / 100}.`} />
          <Faq q="Can I earn from a negative review?" a="Yes. Earning depends on the visit being verified and someone later completing a booking through your review — never on what you say about the place." />
          <Faq q="Can I recommend my own business?" a="No. You can’t review a business you manage, and bookings from your own posts never earn commission." />
        </div>
        <div className="card bg-brand-soft border-0 p-7 flex flex-wrap items-center justify-between gap-4"><div><h2 className="h-display text-2xl">Ready to share somewhere you’ve really been?</h2><p className="text-muted">It takes about a minute, and your proof stays private.</p></div><Link href="/share" className="btn btn-primary min-h-12">Share an experience</Link></div>
      </section>
    </>
  );
}
