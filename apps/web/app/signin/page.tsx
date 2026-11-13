import { redirect } from "next/navigation";
import { getMe } from "@/lib/api";
import { SignIn } from "@/components/SignIn";
export const metadata = { title: "Sign in" };
const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/explore");
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const me = await getMe();
  if (me.user) redirect(safe(next));
  return <div className="wrap py-14 lg:py-20"><SignIn next={safe(next)} preview={me.otpPreview} /></div>;
}
