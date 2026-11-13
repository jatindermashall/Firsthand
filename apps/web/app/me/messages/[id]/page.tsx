import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { api } from "@/lib/api";
import { TextForm } from "@/components/actions";
import { dateTime } from "@/lib/format";
type T = { id: number; with: { id: number; name: string; handle: string; initials: string } | null; messages: { id: number; mine: boolean; body: string; masked: boolean; createdAt: string }[] };
export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/me/messages/${id}`);
  const t = await api<T>(`/threads/${id}`);
  return (
    <div className="wrap py-10 pb-16 max-w-3xl flex flex-col gap-5">
      <Link href="/me/messages" className="text-sm text-faint hover:text-brand">← All messages</Link>
      <h1 className="h-display text-3xl">{t.with ? <Link href={`/u/${t.with.handle}`} className="hover:text-brand">{t.with.name}</Link> : "Conversation"}</h1>
      <ol className="flex flex-col gap-3">{t.messages.map((m) => (
        <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] ${m.mine ? "self-end bg-brand text-white" : "self-start bg-white border border-line"}`}>
          <p className="whitespace-pre-line">{m.body}</p><span className={`block text-[11.5px] mt-1 ${m.mine ? "text-[#CFE6E0]" : "text-faint"}`}>{dateTime(m.createdAt)}{m.masked ? " · contact details hidden" : ""}</span></li>
      ))}</ol>
      <div className="card p-4"><TextForm path={`/threads/${id}/messages`} label="Reply" button="Send" min={1} /></div>
      <p className="text-[12.5px] text-faint">Keep bookings on Firsthand so the recommendation is credited and both of you are protected.</p>
    </div>
  );
}
