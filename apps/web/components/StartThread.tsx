"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/lib/client";
import { Icon } from "./icons";

export function StartThread({ toUserId, name, experienceId, signedIn }: { toUserId: number; name: string; experienceId?: number; signedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" className="btn btn-outline btn-sm" onClick={() => (signedIn ? setOpen(true) : router.push(`/signin?next=${encodeURIComponent(location.pathname)}`))}><Icon name="chat" />Message {name.split(" ")[0]}</button>;
  return (
    <form className="card p-4 flex flex-col gap-2 w-full" onSubmit={async (e) => {
      e.preventDefault(); setErr(null); setBusy(true);
      try { const r = await call<{ threadId: number }>("/threads", { toUserId, body, experienceId }); router.push(`/me/messages/${r.threadId}`); }
      catch (x: any) { setErr(x.message); setBusy(false); }
    }}>
      <label className="label mb-0" htmlFor="dm">Your question for {name}</label>
      <textarea id="dm" rows={3} className="input py-2.5" value={body} onChange={(e) => setBody(e.target.value)} required minLength={2} placeholder="Ask what you’d ask a friend who’s been there" />
      <p className="text-[12.5px] text-faint">Phone numbers and emails are hidden automatically. Keep bookings on Firsthand so both of you stay protected.</p>
      {err && <p role="alert" className="notice bg-danger-soft text-danger">{err}</p>}
      <div className="flex gap-2"><button className="btn btn-primary btn-sm" disabled={busy}>Send</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
