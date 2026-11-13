import Link from "next/link";
import { Icon } from "./icons";
import { LEVEL, TIER, ago, CATEGORY_ONE } from "@/lib/format";
import type { Card, Tier } from "@/lib/types";

export function LevelBadge({ level }: { level: number }) {
  const l = LEVEL[level] ?? LEVEL[0]!;
  return <span className={`badge ${l.cls}`}>{level >= 2 && <Icon name="shield" className="w-3.5 h-3.5" />}{l.text}</span>;
}
export function TierBadge({ tier, score }: { tier: Tier; score?: number | null }) {
  const t = TIER[tier];
  return <span className={`badge ${t.cls}`} title={t.help}>{t.text}{score != null && tier !== "new" ? ` · ${score}` : ""}</span>;
}
export const Stars = ({ r }: { r: number }) => (
  <span className="inline-flex items-center gap-1 font-bold text-ink"><Icon name="star" className="w-3.5 h-3.5 text-[#C27A0E]" />{r.toFixed(1)}<span className="sr-only"> out of 5</span></span>
);
export const Avatar = ({ i, size = "w-9 h-9 text-[13px]" }: { i: string; size?: string }) => (
  <span aria-hidden="true" className={`${size} shrink-0 rounded-full bg-[#F1E7D3] text-[#7A4A06] font-bold flex items-center justify-center`}>{i}</span>
);
export const Disclosure = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-amber-line bg-amber-soft px-4 py-3 text-sm text-amber-ink"><Icon name="info" className="w-[18px] h-[18px] mt-0.5" /><span>{children}</span></div>
);
export const SampleTag = () => <span className="tag border border-line">Sample listing</span>;
const TONES = ["ph", "ph ph-b", "ph ph-c"];

export function ExperienceCard({ c }: { c: Card }) {
  return (
    <Link href={`/e/${c.slug}`} className="card overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className={`${TONES[c.id % 3]} h-40 flex items-start justify-between gap-2 p-3`}>
        <span className="tag">{CATEGORY_ONE[c.business.category]} · {c.business.area ? `${c.business.area}, ` : ""}{c.business.city}</span>
        {c.business.isSample && <SampleTag />}
      </div>
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div><LevelBadge level={c.level} /></div>
        <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
        <p className="text-muted text-[14.5px] flex-1">“{c.quote}”</p>
        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3 text-[13.5px]">
          <span className="text-muted flex items-center gap-2 min-w-0"><strong className="text-ink font-semibold truncate">{c.author.name}</strong><TierBadge tier={c.author.tier} /></span>
          <Stars r={c.rating} />
        </div>
        <div className="flex items-center justify-between text-[13px] text-faint"><span>{ago(c.publishedAt)}</span><span>{c.helpful} found helpful</span></div>
      </div>
    </Link>
  );
}
export function Grid({ items, empty }: { items: Card[]; empty?: React.ReactNode }) {
  if (!items.length) return <div className="card p-10 text-center text-muted">{empty ?? "Nothing here yet."}</div>;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((c) => <ExperienceCard key={c.id} c={c} />)}</div>;
}
export const PageTitle = ({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) => (
  <div className="flex flex-col gap-2">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1 className="h-display text-4xl sm:text-[44px] leading-tight">{title}</h1>{children && <div className="text-muted max-w-2xl">{children}</div>}</div>
);
