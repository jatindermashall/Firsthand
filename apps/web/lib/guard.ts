import "server-only";
import { redirect } from "next/navigation";
import { getMe } from "./api";
export async function requireUser(next: string) {
  const me = await getMe();
  if (!me.user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return me.user;
}
