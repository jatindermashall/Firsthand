"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { call } from "@/lib/client";
import { Icon } from "./icons";

type Biz = { id: number; slug: string; name: string; city: string; area: string | null; category: string; services: { id: number; name: string }[] };
const STEPS = ["Place & date", "Your experience", "Proof", "Check & publish"];
const today = () => new Date(Date.now() + 330 * 6e4).toISOString().slice(0, 10);

export function ShareFlow({ initialBusiness }: { initialBusiness?: string }) {
  const [step, setStep] = useState(0);
  const [q, setQ] = useState(initialBusiness ?? "");
  const [results, setResults] = useState<Biz[]>([]);
  const [biz, setBiz] = useState<Biz | null>(null);
  const [f, setF] = useState({ serviceId: 0, visitedOn: today(), whoFor: "Just me", rating: 4, story: "", pros: "", cons: "", suits: "", parking: "", access: "", pricePaid: "", proofType: "business_confirm", freeOrDiscounted: false, consent: true, honest: true });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ slug: string; status: string } | null>(null);

  useEffect(() => {
    if (biz) return;
    const t = setTimeout(() => { call<{ items: Biz[] }>(`/businesses?q=${encodeURIComponent(q)}`).then((r) => setResults(r.items)).catch(() => {}); }, 200);
    return () => clearTimeout(t);
  }, [q, biz]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const go = (n: number) => { setErr(null); setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      if (f.proofType === "receipt" && !file) throw new Error("Add a photo or PDF of your receipt, or choose another kind of proof.");
      const r = await call<{ id: number; slug: string; status: string }>("/experiences", {
        businessId: biz!.id, serviceId: f.serviceId || undefined, visitedOn: f.visitedOn, whoFor: f.whoFor, rating: Number(f.rating), story: f.story,
        pros: f.pros || undefined, cons: f.cons || undefined, suits: f.suits || undefined, parking: f.parking || undefined, access: f.access || undefined, pricePaid: f.pricePaid || undefined,
        proofType: f.proofType, freeOrDiscounted: f.freeOrDiscounted, consent: f.consent, honest: f.honest,
      });
      if (f.proofType === "receipt" && file) { const fd = new FormData(); fd.append("file", file); await call(`/experiences/${r.id}/evidence`, fd); }
      setDone(r); go(4);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const Dots = () => (
    <ol className="flex flex-wrap items-center gap-4 sm:gap-6">{STEPS.map((s, i) => (
      <li key={s} aria-current={i === step ? "step" : undefined} className={`flex items-center gap-2 text-sm ${i === step ? "text-ink font-semibold" : "text-faint"}`}>
        <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-[13px] font-bold ${i < step ? "bg-brand border-brand text-white" : "border-line bg-white"}`}>{i < step ? <Icon name="check" className="w-3.5 h-3.5" /> : i + 1}</span><span className="hidden sm:inline">{s}</span></li>
    ))}</ol>
  );
  const Err = () => (err ? <p role="alert" className="notice bg-danger-soft text-danger">{err}</p> : null);

  if (step === 4 && done) return (
    <div className="card rounded-3xl p-7 sm:p-9 flex flex-col items-center text-center gap-4">
      <span className="w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center"><Icon name="check" className="w-7 h-7" /></span>
      {done.status === "published" ? (<><h2 className="h-display text-3xl">Published</h2><p className="text-muted max-w-md">Your visit was already confirmed through your Firsthand booking, so your review went live with a confirmed-visit badge.</p></>)
        : (<><h2 className="h-display text-3xl">Submitted for checking</h2><p className="text-muted max-w-md">{f.proofType === "business_confirm" ? `We’ve asked ${biz?.name} to confirm your visit.` : "A moderator will check your receipt privately."} You’ll see the result and the reason in your profile.</p></>)}
      <div className="flex flex-wrap justify-center gap-3"><Link href={`/e/${done.slug}`} className="btn btn-dark">View your post</Link><Link href="/explore" className="btn btn-outline">Keep exploring</Link></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-7">
      <Dots />
      {step === 0 && (
        <form className="card rounded-3xl p-6 sm:p-7 flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (!biz) return setErr("Pick the place you visited."); go(1); }}>
          <div>
            <label className="label" htmlFor="place">Where did you go?</label>
            {biz ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand bg-[#F2F8F6] px-4 py-3"><span><strong>{biz.name}</strong><span className="block text-sm text-muted">{biz.area ? `${biz.area}, ` : ""}{biz.city}</span></span><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setBiz(null); setF({ ...f, serviceId: 0 }); }}>Change</button></div>
            ) : (
              <>
                <div className="relative"><input id="place" className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search businesses on Firsthand" autoComplete="off" /><span className="absolute left-3.5 top-3.5 text-faint"><Icon name="search" /></span></div>
                <ul className="mt-2 flex flex-col gap-1.5 max-h-72 overflow-auto">{results.map((b) => (
                  <li key={b.id}><button type="button" className="w-full text-left rounded-xl border border-line bg-white px-4 py-2.5 hover:border-brand" onClick={() => setBiz(b)}><strong className="font-semibold">{b.name}</strong><span className="block text-[13px] text-muted">{b.area ? `${b.area}, ` : ""}{b.city}</span></button></li>
                ))}</ul>
                <p className="text-[13px] text-faint mt-2">Can’t find it? Only businesses listed on Firsthand can be reviewed during the pilot. <Link className="underline" href="/for-business">Suggest one</Link>.</p>
              </>
            )}
          </div>
          {biz && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="svc">What did you have done?</label><select id="svc" className="input" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: Number(e.target.value) })}><option value={0}>Something else / general visit</option>{biz.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="label" htmlFor="date">When?</label><input id="date" type="date" max={today()} className="input" value={f.visitedOn} onChange={set("visitedOn")} required /></div>
            </div>
          )}
          <div><span className="label">Who was it for?</span><div className="flex flex-wrap gap-2">{["Just me", "Couple", "Family", "Friends"].map((w) => <button key={w} type="button" aria-pressed={f.whoFor === w} className={`chip ${f.whoFor === w ? "chip-on" : ""}`} onClick={() => setF({ ...f, whoFor: w })}>{w}</button>)}</div></div>
          <Err />
          <div className="flex justify-end"><button className="btn btn-primary">Next</button></div>
        </form>
      )}
      {step === 1 && (
        <form className="card rounded-3xl p-6 sm:p-7 flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (f.story.trim().length < 40) return setErr("Tell people a bit more — at least 40 characters."); go(2); }}>
          <div><span className="label">Overall</span><div className="flex flex-wrap gap-2" role="group" aria-label="Rating out of 5">{[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((r) => <button key={r} type="button" aria-pressed={f.rating === r} className={`chip w-12 justify-center px-0 ${f.rating === r ? "chip-on" : ""}`} onClick={() => setF({ ...f, rating: r })}>{r}</button>)}</div></div>
          <div><label className="label" htmlFor="story">What happened?</label><textarea id="story" rows={5} className="input py-3" value={f.story} onChange={set("story")} placeholder="What would you tell a friend who’s thinking of going? Critical reviews are welcome." /><p className="text-[12.5px] text-faint mt-1">{f.story.trim().length}/40 characters minimum</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="pros">What was good</label><textarea id="pros" rows={3} className="input py-3" value={f.pros} onChange={set("pros")} placeholder="One per line" /></div><div><label className="label" htmlFor="cons">What to watch for</label><textarea id="cons" rows={3} className="input py-3" value={f.cons} onChange={set("cons")} placeholder="One per line" /></div></div>
          <div><label className="label" htmlFor="suits">Who does it suit? (comma-separated)</label><input id="suits" className="input" value={f.suits} onChange={set("suits")} placeholder="e.g. Thick hair, Weekday visits" /></div>
          <div className="grid gap-4 sm:grid-cols-3"><div><label className="label" htmlFor="parking">Parking</label><input id="parking" className="input" value={f.parking} onChange={set("parking")} /></div><div><label className="label" htmlFor="access">Access</label><input id="access" className="input" value={f.access} onChange={set("access")} placeholder="Steps, lift…" /></div><div><label className="label" htmlFor="paid">Price you paid</label><input id="paid" className="input" value={f.pricePaid} onChange={set("pricePaid")} placeholder="₹" /></div></div>
          <Err />
          <div className="flex justify-between"><button type="button" className="btn btn-ghost" onClick={() => go(0)}>Back</button><button className="btn btn-primary">Next</button></div>
        </form>
      )}
      {step === 2 && (
        <form className="card rounded-3xl p-6 sm:p-7 flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (!f.consent) return setErr("We need your OK to check the proof privately."); go(3); }}>
          <div><h2 className="text-xl font-semibold">Prove you were there</h2><p className="text-muted text-[15px]">Pick the easiest option. Stronger proof gets a stronger badge.</p></div>
          <fieldset className="flex flex-col gap-2.5"><legend className="sr-only">Proof type</legend>
            {([
              ["firsthand_booking", "I booked through Firsthand", "If your visit was confirmed with a check-in code, your post goes live straight away.", "Visit confirmed by the business"],
              ["business_confirm", "Ask the business to confirm", `We’ll ask ${biz?.name ?? "the business"} to confirm your visit on that date.`, "Visit confirmed by the business"],
              ["receipt", "Upload a receipt or invoice", "Shows you paid, not that the visit happened — so it can’t earn commission.", "Booking reviewed"],
            ] as const).map(([v, t, d, b]) => (
              <label key={v} className="flex items-start gap-3 rounded-2xl border border-line p-4 cursor-pointer has-checked:border-brand has-checked:bg-[#F2F8F6] has-checked:ring-1 has-checked:ring-brand">
                <input type="radio" name="proof" checked={f.proofType === v} onChange={() => setF({ ...f, proofType: v })} className="accent-brand w-[18px] h-[18px] mt-1" />
                <span className="flex-1"><strong className="block">{t}</strong><span className="text-muted text-sm">{d}</span></span><span className="badge bg-cream text-muted hidden sm:inline-flex">{b}</span>
              </label>
            ))}
          </fieldset>
          {f.proofType === "receipt" && (
            <label className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-cream p-7 text-center cursor-pointer hover:border-brand">
              <Icon name="upload" className="w-6 h-6 text-brand" /><span className="font-semibold">{file ? file.name : "Choose a photo or PDF of your receipt"}</span><span className="text-[13px] text-faint">JPG, PNG, WebP or PDF, up to 5 MB. Only a moderator sees it.</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
          <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm cursor-pointer"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} className="accent-brand w-[18px] h-[18px] mt-0.5" /><span><strong className="flex items-center gap-1.5"><Icon name="lock" />I agree to Firsthand checking this proof privately</strong><span className="text-muted">It’s used only to verify this visit and is never shown publicly.</span></span></label>
          <Err />
          <div className="flex justify-between"><button type="button" className="btn btn-ghost" onClick={() => go(1)}>Back</button><button className="btn btn-primary">Next</button></div>
        </form>
      )}
      {step === 3 && (
        <div className="card rounded-3xl p-6 sm:p-7 flex flex-col gap-5">
          <h2 className="text-xl font-semibold">Check and publish</h2>
          <div className="rounded-2xl border border-line p-5 flex flex-col gap-2"><strong className="text-lg">{(biz?.services.find((s) => s.id === f.serviceId)?.name ?? "Visit")} at {biz?.name}</strong><span className="text-sm text-muted">{f.rating} / 5 · {f.whoFor} · {f.visitedOn}</span><p className="text-[15px] text-ink-2 whitespace-pre-line">{f.story}</p></div>
          <fieldset className="flex flex-col gap-3 text-[15px]"><legend className="label">Disclosures</legend>
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={f.freeOrDiscounted} onChange={(e) => setF({ ...f, freeOrDiscounted: e.target.checked })} className="accent-brand w-[18px] h-[18px] mt-1" /><span>I received this free or at a discount from the business</span></label>
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={f.honest} onChange={(e) => setF({ ...f, honest: e.target.checked })} className="accent-brand w-[18px] h-[18px] mt-1" /><span>This is my own honest experience, and a commission disclosure will show on it if it becomes bookable</span></label>
          </fieldset>
          <Err />
          <div className="flex justify-between"><button type="button" className="btn btn-ghost" onClick={() => go(2)}>Back</button><button type="button" className="btn btn-primary" disabled={busy || !f.honest} onClick={submit}>{busy ? "Submitting…" : "Submit"}</button></div>
        </div>
      )}
    </div>
  );
}
