"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { call } from "@/lib/client";
import { inr } from "@/lib/format";
import { Icon } from "./icons";

type Svc = { id: number; name: string; durationMin: number; pricePaise: number; unit: string | null };
type Slot = { at: string; label: string; available: boolean };

const istDate = (offset: number) => new Date(Date.now() + 330 * 6e4 + offset * 864e5).toISOString().slice(0, 10);

export function BookingPanel({ defaultServiceId, businessId, businessName, services, experienceId, recommender, signedIn, isAuthor }: {
  defaultServiceId?: number; businessId: number; businessName: string; services: Svc[]; experienceId?: number; recommender?: string; signedIn: boolean; isAuthor?: boolean;
}) {
  const [svc, setSvc] = useState(services.find((x) => x.id === defaultServiceId)?.id ?? services[0]?.id);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => istDate(i)), []);
  const [day, setDay] = useState(days[0]!);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);
  const s = services.find((x) => x.id === svc);

  useEffect(() => {
    let live = true;
    setSlots(null); setSlot(null);
    call<{ slots: Slot[] }>(`/businesses/${businessId}/slots?date=${day}`).then((r) => { if (!live) return; if (day === days[0] && r.slots.every((x) => !x.available)) { setDay(days[1]!); return; } setSlots(r.slots); }).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [businessId, day, days]);

  if (!services.length) return <aside className="card rounded-3xl p-6 text-muted">This business isn’t taking bookings on Firsthand yet. You can still save this and ask questions.</aside>;

  if (done) return (
    <aside className="card rounded-3xl p-6 flex flex-col gap-4 text-center items-center">
      <span className="w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center"><Icon name="check" className="w-7 h-7" /></span>
      <h2 className="h-display text-2xl">You’re booked</h2>
      <p className="text-muted text-[15px]">{s?.name} · {businessName}<br />{new Date(slot!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</p>
      <div className="w-full rounded-2xl bg-cream p-4"><span className="text-[13px] font-semibold text-muted">Your check-in code</span><div className="h-display text-4xl tracking-[0.18em] py-1">{done.code.slice(0, 3)} {done.code.slice(3)}</div><span className="text-[13px] text-faint">Show this at the counter so your visit is confirmed</span></div>
      <Link href="/me/bookings" className="btn btn-dark w-full">View my bookings</Link>
    </aside>
  );

  const book = async () => {
    if (!signedIn) { location.href = `/signin?next=${encodeURIComponent(location.pathname)}`; return; }
    setErr(null); setBusy(true);
    try { const r = await call<{ code: string }>("/bookings", { serviceId: svc, slotAt: slot, experienceId }); setDone(r); }
    catch (e: any) { setErr(e.message); if (/taken/.test(e.message)) setDay(day); }
    finally { setBusy(false); }
  };

  return (
    <aside aria-label="Book this service" className="card rounded-3xl p-6 flex flex-col gap-5 shadow-[0_12px_36px_rgba(16,41,43,0.08)]">
      <div><span className="text-[13px] font-semibold text-muted">Book at {businessName}</span><h2 className="h-display text-2xl">{s?.name}</h2></div>
      <fieldset className="flex flex-col gap-2"><legend className="label">Service</legend>
        {services.map((x) => (
          <label key={x.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3 cursor-pointer has-checked:border-brand has-checked:bg-[#F2F8F6] has-checked:ring-1 has-checked:ring-brand">
            <span className="flex items-center gap-2.5"><input type="radio" name="svc" checked={svc === x.id} onChange={() => setSvc(x.id)} className="accent-brand w-[18px] h-[18px]" />{x.name}</span>
            <span className="text-muted whitespace-nowrap">{inr(x.pricePaise)}{x.unit ? ` ${x.unit}` : ""}</span>
          </label>
        ))}
      </fieldset>
      <div>
        <span className="label">Day</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Day">
          {days.map((d, i) => {
            const dt = new Date(d + "T00:00:00Z");
            return <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)} className={`chip rounded-xl flex-col !min-h-14 px-3 leading-tight ${day === d ? "!bg-[#F2F8F6] !border-brand text-brand-dark font-semibold" : ""}`}>
              <span className="text-[11px] uppercase">{i === 0 ? "Today" : dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</span><span>{dt.getUTCDate()}</span></button>;
          })}
        </div>
      </div>
      <div>
        <span className="label">Time</span>
        {!slots ? <p className="text-sm text-faint">Loading times…</p> : slots.every((x) => !x.available) ? <p className="text-sm text-muted">No times left on this day. Try another day.</p> : (
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Time">
            {slots.map((x) => <button key={x.at} type="button" disabled={!x.available} aria-pressed={slot === x.at} onClick={() => setSlot(x.at)}
              className={`chip justify-center rounded-xl min-h-11 disabled:opacity-35 disabled:line-through disabled:cursor-not-allowed ${slot === x.at ? "!bg-[#F2F8F6] !border-brand text-brand-dark font-semibold" : ""}`}>{x.label}</button>)}
          </div>
        )}
      </div>
      <dl className="flex flex-col gap-2 text-[14.5px] border-t border-line-soft pt-4">
        <div className="flex justify-between"><dt className="text-muted">Price set by the business</dt><dd>{s ? inr(s.pricePaise) : "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Booking fee</dt><dd>₹0</dd></div>
        <div className="flex justify-between font-bold text-base border-t border-line-soft pt-2.5"><dt>Pay at the venue</dt><dd>{s ? inr(s.pricePaise) : "—"}</dd></div>
      </dl>
      <p className="rounded-xl bg-cream px-3.5 py-3 text-[13.5px] text-muted"><strong className="text-ink">Free cancellation</strong> any time before your slot. Taxes, if any, are added by the business at the venue.</p>
      {err && <p role="alert" className="notice bg-danger-soft text-danger">{err}</p>}
      {isAuthor ? <p className="notice bg-sand text-muted">This is your own review — bookings you make here don’t earn you commission.</p> : null}
      <button type="button" className="btn btn-primary min-h-[52px] text-base" disabled={!slot || busy} onClick={book}>{busy ? "Booking…" : slot ? `Reserve ${slots?.find((x) => x.at === slot)?.label}` : "Pick a time"}</button>
      {recommender && !isAuthor && <p className="text-[12.5px] text-faint text-center">Booking through {recommender}’s review. They earn a share of the business’s commission; your price is the same.</p>}
    </aside>
  );
}
