import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui";
import { ago } from "@/lib/format";
export const metadata = { title: "Messages" };
type T = { id: number; with: { name: string; handle: string; initials: string } | null; last: string; lastAt: string; unread: number };
export default async function Messages() {
  const me = await requireUser("/me/messages");
  const { items } = await api<{ items: T[] }>("/me/threads");
  return (
    <div className="wrap py-10 pb-16 max-w-3xl flex flex-col gap-6">
      <div className="flex flex-col gap-1.5"><h1 className="h-display text-4xl">Messages</h1><p className="text-muted">Direct questions between people planning a visit and people who’ve been. {me.openForQuestions ? "You’re open for questions." : <>You’re not taking direct questions. <Link href="/me/settings" className="font-semibold text-brand">Change</Link></>}</p></div>
      {items.length === 0 ? <div className="card p-10 text-center text-muted">No messages yet. Look for “Message” on a reviewer’s profile.</div> : (
        <ul className="card overflow-hidden">{items.map((t) => (
          <li key={t.id} className="border-t border-line-soft first:border-t-0"><Link href={`/me/messages/${t.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-cream"><Avatar i={t.with?.initials ?? "?"} /><span className="flex-1 min-w-0"><span className="flex justify-between gap-2"><strong className={t.unread ? "" : "font-semibold"}>{t.with?.name ?? "Member"}</strong><span className="text-[12.5px] text-faint">{ago(t.lastAt)}</span></span><span className="block truncate text-sm text-muted">{t.last}</span></span>{t.unread > 0 && <span className="pill bg-brand text-white">{t.unread}</span>}</Link></li>
        ))}</ul>
      )}
      <p className="text-[12.5px] text-faint">Phone numbers, emails and messaging links are hidden automatically. Recorded calls and paid Guide sessions are coming later in the pilot.</p>
    </div>
  );
}
