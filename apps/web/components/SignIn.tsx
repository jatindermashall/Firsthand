"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/lib/client";

export function SignIn({ next, preview }: { next: string; preview: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async (e?: React.FormEvent) => {
    e?.preventDefault(); setErr(null); setBusy(true);
    try { const r = await call<{ previewCode?: string }>("/auth/request-code", { email }); setPreviewCode(r.previewCode ?? null); setStep("code"); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const r = await call<{ needsProfile: boolean }>("/auth/verify", { email, code });
      router.push(r.needsProfile ? `/me/settings?welcome=1&next=${encodeURIComponent(next)}` : next);
      router.refresh();
    } catch (x: any) { setErr(x.message); setBusy(false); }
  };

  return (
    <div className="card rounded-3xl p-6 sm:p-8 w-full max-w-md mx-auto flex flex-col gap-5">
      {step === "email" ? (
        <form onSubmit={request} className="flex flex-col gap-5">
          <div><h1 className="h-display text-[28px]">Sign in or create an account</h1><p className="text-muted text-[15px]">We’ll {preview ? "give" : "email"} you a 6-digit code. No password.</p></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></div>
          {err && <p role="alert" className="notice bg-danger-soft text-danger">{err}</p>}
          <button className="btn btn-primary min-h-12" disabled={busy}>{busy ? "Sending…" : "Get a code"}</button>
          <p className="text-[12.5px] text-faint">By continuing you agree to the <a className="underline" href="/legal">Terms and Privacy Notice</a>.</p>
          {preview && (
            <div className="rounded-xl bg-cream p-4 text-[13.5px] text-muted">
              <strong className="block text-ink mb-1">Trying the pilot preview?</strong>
              Sign in as a sample member to see each side:
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[["simran@demo.firsthand.local", "Recommender (Top Guide)"], ["neha@demo.firsthand.local", "Business owner"], ["visitor1@demo.firsthand.local", "Visitor"]].map(([e, t]) => (
                  <button key={e} type="button" className="chip text-[13px] min-h-9" onClick={() => setEmail(e)}>{t}</button>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-5">
          <div><h1 className="h-display text-[28px]">Enter your code</h1><p className="text-muted text-[15px]">For {email}. <button type="button" className="font-semibold text-brand" onClick={() => { setStep("email"); setCode(""); }}>Change</button></p></div>
          {previewCode && <p className="notice bg-amber-soft text-amber-ink border border-amber-line">Pilot preview: email sending isn’t connected yet, so here’s your code: <strong className="tracking-widest">{previewCode}</strong></p>}
          <div><label className="label" htmlFor="code">6-digit code</label><input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-2xl tracking-[0.4em] min-h-14" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus /></div>
          {err && <p role="alert" className="notice bg-danger-soft text-danger">{err}</p>}
          <button className="btn btn-primary min-h-12" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
          <button type="button" className="text-sm font-semibold text-muted" onClick={() => request()} disabled={busy}>Send a new code</button>
        </form>
      )}
    </div>
  );
}
