import { requireUser } from "@/lib/guard";
import { ProfileForm, LogoutButton } from "@/components/actions";
import { api } from "@/lib/api";
import Link from "next/link";
export const metadata = { title: "Your profile" };
type Mine = { items: { id: number; slug: string; title: string; status: string; level: number; proofType: string; rejectReason: string | null; hasEvidence: boolean; business: string }[] };
export default async function Settings({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const me = await requireUser("/me/settings");
  const mine = await api<Mine>("/me/experiences");
  const label: Record<string, string> = { pending: "Waiting for verification", published: "Published", rejected: "Not published" };
  return (
    <div className="wrap py-10 pb-16 max-w-3xl flex flex-col gap-7">
      <div className="flex flex-col gap-2"><h1 className="h-display text-4xl">{welcome ? "Welcome to Firsthand" : "Your profile"}</h1><p className="text-muted">{welcome ? "Add your name so people know whose experience they’re reading." : `Signed in as ${me.email}.`}</p></div>
      <ProfileForm me={me} />
      <section className="flex flex-col gap-3"><h2 className="h-display text-2xl">Your posts</h2>
        {mine.items.length === 0 ? <p className="text-muted">Nothing yet. <Link className="font-semibold text-brand" href="/share">Share your first experience</Link>.</p> : (
          <ul className="card overflow-hidden">{mine.items.map((x) => <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-line-soft first:border-t-0"><div><Link href={`/e/${x.slug}`} className="font-semibold hover:text-brand">{x.title}</Link><span className="block text-[13px] text-muted">{x.rejectReason ?? (x.status === "pending" ? (x.proofType === "business_confirm" ? "Waiting for the business to confirm your visit" : x.hasEvidence ? "A moderator will check your receipt" : "Upload a receipt to continue") : "")}</span></div><span className={`pill ${x.status === "published" ? "bg-brand-soft text-brand-dark" : x.status === "pending" ? "bg-amber-soft text-amber-ink" : "bg-danger-soft text-danger"}`}>{label[x.status]}</span></li>)}</ul>
        )}
      </section>
      <div><LogoutButton /></div>
    </div>
  );
}
