import { redirect } from "next/navigation";
import { getMe } from "@/lib/api";
import { ShareFlow } from "@/components/ShareFlow";
export const metadata = { title: "Share an experience" };
export default async function Share() {
  const me = await getMe();
  if (!me.user) redirect("/signin?next=/share");
  if (!me.user.name) redirect("/me/settings?welcome=1&next=/share");
  return (
    <div className="wrap py-10 pb-16 max-w-3xl flex flex-col gap-7">
      <div className="flex flex-col gap-2"><h1 className="h-display text-4xl">Share an experience</h1><p className="text-muted">About a minute. Say what you’d tell a friend — good and bad. Critical reviews earn exactly like positive ones.</p></div>
      <ShareFlow />
    </div>
  );
}
