"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { call } from "@/lib/client";
import { Icon } from "./icons";

/** Runs an API call, shows its error inline, refreshes server data on success. */
function useAction() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<unknown>, after?: (r: any) => void) => {
    setErr(null);
    start(async () => {
      try { const r = await fn(); after?.(r); router.refresh(); }
      catch (e: any) {
        if (/sign in/i.test(e.message)) { router.push(`/signin?next=${encodeURIComponent(location.pathname)}`); return; }
        setErr(e.message);
      }
    });
  };
  return { err, busy, run, setErr };
}
const Err = ({ msg }: { msg: string | null }) => (msg ? <p role="alert" className="notice bg-danger-soft text-danger">{msg}</p> : null);

export function ToggleButton({ path, on, labelOn, labelOff, icon, className = "btn btn-outline btn-sm" }: { path: string; on: boolean; labelOn: string; labelOff: string; icon?: string; className?: string }) {
  const a = useAction();
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={a.busy} aria-pressed={on} onClick={() => a.run(() => call(path, {}))} className={`${className} ${on ? "!bg-brand-soft !border-brand !text-brand-dark" : ""}`}>
        {icon && <Icon name={icon} />}{on ? labelOn : labelOff}
      </button>
      <Err msg={a.err} />
    </span>
  );
}

export function LogoutButton() {
  const a = useAction();
  return <button type="button" className="btn btn-ghost" onClick={() => a.run(() => call("/auth/logout", {}), () => (location.href = "/"))}>Sign out</button>;
}

export function TextForm({ path, label, placeholder, button, rows = 2, min = 2, done, field = "body" }: { path: string; label: string; placeholder?: string; button: string; rows?: number; min?: number; done?: string; field?: string }) {
  const a = useAction();
  const [v, setV] = useState("");
  const [ok, setOk] = useState(false);
  if (ok && done) return <p className="notice bg-brand-soft text-brand-dark">{done}</p>;
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); a.run(() => call(path, { [field]: v }), () => { setV(""); setOk(true); }); }}>
      <label className="label mb-0">{label}<textarea className="input py-2.5 mt-1.5 font-normal" rows={rows} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} required minLength={min} /></label>
      <Err msg={a.err} />
      <button className="btn btn-primary btn-sm self-start" disabled={a.busy || v.trim().length < min}>{a.busy ? "Sending…" : button}</button>
    </form>
  );
}

export function Reveal({ label, className = "btn btn-outline btn-sm", children }: { label: React.ReactNode; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? <div className="w-full">{children}</div> : <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>;
}

export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(location.origin + path); setDone(true); } catch { setDone(false); } }}>
      <Icon name="share" />{done ? "Link copied" : "Copy link"}
    </button>
  );
}

export function ActionButton({ path, body = {}, label, busyLabel, className = "btn btn-primary btn-sm", confirm, done, method }: { path: string; body?: unknown; label: React.ReactNode; busyLabel?: string; className?: string; confirm?: string; done?: string; method?: string }) {
  const a = useAction();
  const [asking, setAsking] = useState(false);
  const [ok, setOk] = useState(false);
  if (ok && done) return <p className="notice bg-brand-soft text-brand-dark">{done}</p>;
  if (asking) return (
    <span className="flex flex-wrap items-center gap-2 text-sm"><span>{confirm}</span>
      <button type="button" className="btn btn-danger btn-sm" disabled={a.busy} onClick={() => a.run(() => call(path, body, method), () => { setAsking(false); setOk(true); })}>Yes</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>No</button><Err msg={a.err} /></span>
  );
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className={className} disabled={a.busy} onClick={() => (confirm ? setAsking(true) : a.run(() => call(path, body, method), () => setOk(true)))}>{a.busy ? busyLabel ?? "Working…" : label}</button>
      <Err msg={a.err} />
    </span>
  );
}

export function AccuracyRater({ bookingId, name }: { bookingId: number; name: string }) {
  const a = useAction();
  return (
    <div className="rounded-2xl bg-brand-soft p-4 flex flex-col gap-3">
      <div><strong className="block">Did it match what {name} said?</strong><span className="text-sm text-muted">Your answer builds their Trust Score. It’s about accuracy, not whether you liked the place.</span></div>
      <div className="flex flex-wrap gap-2">
        {([["yes", "Yes, it matched"], ["mostly", "Mostly"], ["no", "No, it didn’t"]] as const).map(([v, t]) => (
          <button key={v} type="button" disabled={a.busy} className="btn btn-outline btn-sm" onClick={() => a.run(() => call(`/bookings/${bookingId}/accuracy`, { answer: v }))}>{t}</button>
        ))}
      </div>
      <Err msg={a.err} />
    </div>
  );
}

export function ProfileForm({ me }: { me: { name: string | null; handle: string | null; city: string | null; bio: string | null; openForQuestions: boolean } }) {
  const a = useAction();
  const router = useRouter();
  const [f, setF] = useState({ name: me.name ?? "", handle: me.handle ?? "", city: me.city ?? "Chandigarh", bio: me.bio ?? "", openForQuestions: me.openForQuestions });
  const [saved, setSaved] = useState(false);
  return (
    <form className="card p-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setSaved(false); a.run(() => call("/me", { ...f, handle: f.handle || undefined, bio: f.bio || undefined }, "PATCH"), () => { setSaved(true); const next = new URLSearchParams(location.search).get("next"); if (next?.startsWith("/")) router.push(next); }); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="p-name">Your name, as others will see it</label><input id="p-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} maxLength={80} placeholder="e.g. Simran K." /></div>
        <div><label className="label" htmlFor="p-city">Home city</label><select id="p-city" className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{["Chandigarh", "Mohali", "Panchkula", "Ludhiana", "Manali", "Kasauli", "Other"].map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div><label className="label" htmlFor="p-handle">Profile handle (optional)</label><div className="flex items-center gap-2"><span className="text-faint text-sm">firsthand.decyb.com/u/</span><input id="p-handle" className="input" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase() })} pattern="[a-z0-9._]{3,30}" placeholder="auto from your name" /></div></div>
      <div><label className="label" htmlFor="p-bio">A line about you (optional)</label><textarea id="p-bio" className="input py-2.5" rows={2} maxLength={400} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="What do you usually try? What do people ask you about?" /></div>
      <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm cursor-pointer"><input type="checkbox" className="accent-brand w-[18px] h-[18px] mt-0.5" checked={f.openForQuestions} onChange={(e) => setF({ ...f, openForQuestions: e.target.checked })} /><span><strong className="block">Open for questions</strong><span className="text-muted">Let people planning a visit message you directly. Phone numbers and emails are hidden automatically. You can turn this off any time.</span></span></label>
      <Err msg={a.err} />
      {saved && <p className="notice bg-brand-soft text-brand-dark">Saved.</p>}
      <button className="btn btn-primary self-start" disabled={a.busy}>{a.busy ? "Saving…" : "Save profile"}</button>
    </form>
  );
}

export function LeadForm() {
  const a = useAction();
  const [ok, setOk] = useState(false);
  const [f, setF] = useState({ businessName: "", category: "Salon or spa", city: "Chandigarh", contactName: "", phone: "" });
  if (ok) return <div className="card rounded-3xl p-8 flex flex-col items-center text-center gap-3"><span className="w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center"><Icon name="check" className="w-7 h-7" /></span><h3 className="h-display text-2xl">Thanks — we’ll be in touch</h3><p className="text-muted">Our partner team will call you within two working days.</p></div>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="card rounded-3xl p-6 sm:p-7 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); a.run(() => call("/leads", f), () => setOk(true)); }}>
      <div><label className="label" htmlFor="l-name">Business name</label><input id="l-name" className="input" value={f.businessName} onChange={set("businessName")} required minLength={2} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="l-cat">Category</label><select id="l-cat" className="input" value={f.category} onChange={set("category")}>{["Salon or spa", "Homestay or boutique stay", "Wellness or fitness", "Tours and activities", "Restaurant"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label" htmlFor="l-city">City</label><select id="l-city" className="input" value={f.city} onChange={set("city")}>{["Chandigarh", "Mohali", "Panchkula", "Ludhiana", "Manali", "Kasauli"].map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="l-person">Your name</label><input id="l-person" className="input" value={f.contactName} onChange={set("contactName")} required minLength={2} /></div>
        <div><label className="label" htmlFor="l-phone">Mobile number</label><input id="l-phone" type="tel" inputMode="tel" className="input" placeholder="+91" value={f.phone} onChange={set("phone")} required /></div>
      </div>
      <Err msg={a.err} />
      <button className="btn btn-primary min-h-12" disabled={a.busy}>{a.busy ? "Sending…" : "Request a call back"}</button>
      <p className="text-[12.5px] text-faint">We’ll only use these details to contact you about listing.</p>
    </form>
  );
}

/* ---------- merchant ---------- */
export function ConfirmCode({ businessId }: { businessId: number }) {
  const a = useAction();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="card flex flex-col gap-2 p-3" onSubmit={(e) => { e.preventDefault(); setMsg(null); a.run(() => call(`/merchant/${businessId}/confirm`, { code }), (r) => { setMsg(`Visit confirmed for ${r.client} — ${r.service}.`); setCode(""); }); }}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col px-1.5"><span className="text-xs font-semibold text-muted">Confirm a visit</span><input inputMode="numeric" autoComplete="off" maxLength={7} placeholder="6-digit check-in code" className="w-48 outline-none bg-transparent py-1 tracking-widest placeholder:tracking-normal placeholder:text-faint" value={code} onChange={(e) => setCode(e.target.value)} required /></label>
        <button className="btn btn-primary" disabled={a.busy}>{a.busy ? "Checking…" : "Confirm"}</button>
      </div>
      {msg && <p className="notice bg-brand-soft text-brand-dark flex items-center gap-2"><Icon name="check" />{msg}</p>}
      <Err msg={a.err} />
    </form>
  );
}

export function ServiceForm({ businessId }: { businessId: number }) {
  const a = useAction();
  const [f, setF] = useState({ name: "", durationMin: 60, priceRupees: 1000 });
  return (
    <form className="grid gap-2 sm:grid-cols-[1fr_110px_120px_auto] items-end" onSubmit={(e) => { e.preventDefault(); a.run(() => call(`/merchant/${businessId}/services`, f), () => setF({ name: "", durationMin: 60, priceRupees: 1000 })); }}>
      <label className="label mb-0">Service name<input className="input mt-1.5 font-normal" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} /></label>
      <label className="label mb-0">Minutes<input type="number" min={10} className="input mt-1.5 font-normal" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })} /></label>
      <label className="label mb-0">Price (₹)<input type="number" min={1} className="input mt-1.5 font-normal" value={f.priceRupees} onChange={(e) => setF({ ...f, priceRupees: Number(e.target.value) })} /></label>
      <button className="btn btn-outline" disabled={a.busy}>Add service</button>
      <div className="sm:col-span-4"><Err msg={a.err} /></div>
    </form>
  );
}

/* ---------- admin ---------- */
export function AdminElevate() {
  const a = useAction();
  const [key, setKey] = useState("");
  return (
    <form className="card p-6 flex flex-col gap-3 max-w-md" onSubmit={(e) => { e.preventDefault(); a.run(() => call("/admin/elevate", { key })); }}>
      <h2 className="text-lg font-semibold">Unlock the admin console</h2>
      <p className="text-sm text-muted">Enter the admin access key from the server’s environment. Access lasts 12 hours for this session and is logged.</p>
      <label className="label mb-0" htmlFor="ak">Admin access key</label>
      <input id="ak" type="password" autoComplete="off" className="input" value={key} onChange={(e) => setKey(e.target.value)} required />
      <Err msg={a.err} />
      <button className="btn btn-dark self-start" disabled={a.busy}>Unlock</button>
    </form>
  );
}

export function Decision({ path, options, needsReason = true, levels }: { path: string; options: { value: string; label: string; cls: string }[]; needsReason?: boolean; levels?: boolean }) {
  const a = useAction();
  const [reason, setReason] = useState("");
  const [level, setLevel] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      {levels && (
        <label className="label mb-0">Badge if approved
          <select className="input mt-1.5 font-normal" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            <option value={0}>Default for this proof type</option><option value={1}>Booking reviewed</option><option value={2}>Visit confirmed by the business</option><option value={3}>Confirmed by booking partner</option>
          </select></label>
      )}
      {needsReason && <label className="label mb-0">Reason (shown to the member and kept in the audit log)<input className="input mt-1.5 font-normal" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What you checked and why" /></label>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" className={`btn btn-sm ${o.cls}`} disabled={a.busy || (needsReason && reason.trim().length < 3)}
            onClick={() => a.run(() => call(path, { decision: o.value, reason: reason || undefined, reference: reason || undefined, ...(level ? { level } : {}) }))}>{o.label}</button>
        ))}
      </div>
      <Err msg={a.err} />
    </div>
  );
}

export function AddBusiness() {
  const a = useAction();
  const [f, setF] = useState({ name: "", category: "salon", city: "Chandigarh", area: "", commissionPct: 12 });
  return (
    <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_90px_auto] items-end" onSubmit={(e) => { e.preventDefault(); a.run(() => call("/admin/businesses", { ...f, area: f.area || undefined }), () => setF({ ...f, name: "", area: "" })); }}>
      <label className="label mb-0">Business name<input className="input mt-1.5 font-normal" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
      <label className="label mb-0">Category<select className="input mt-1.5 font-normal" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{[["salon", "Salon/spa"], ["stay", "Stay"], ["wellness", "Wellness"], ["activity", "Activity"], ["food", "Restaurant"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
      <label className="label mb-0">City<input className="input mt-1.5 font-normal" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} required /></label>
      <label className="label mb-0">Area<input className="input mt-1.5 font-normal" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></label>
      <label className="label mb-0">Rate %<input type="number" step="0.5" min={1} max={40} className="input mt-1.5 font-normal" value={f.commissionPct} onChange={(e) => setF({ ...f, commissionPct: Number(e.target.value) })} /></label>
      <button className="btn btn-dark" disabled={a.busy}>Add</button>
      <div className="sm:col-span-2 lg:col-span-6"><Err msg={a.err} /></div>
    </form>
  );
}
export function AddMember({ businessId }: { businessId: number }) {
  const a = useAction();
  const [email, setEmail] = useState("");
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); a.run(() => call(`/admin/businesses/${businessId}/members`, { email }), () => setEmail("")); }}>
      <input type="email" className="input min-h-9 py-1 text-sm max-w-56" placeholder="owner@email.com" aria-label="Owner email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="btn btn-outline btn-sm" disabled={a.busy}>Add owner</button><Err msg={a.err} />
    </form>
  );
}
