import Link from "next/link";
import { getMe } from "@/lib/api";
import { Icon } from "./icons";
import { Avatar } from "./ui";
import { MenuButton } from "./MenuButton";
import { LogoutButton } from "./actions";

export const Logo = () => (
  <Link href="/" className="flex items-center gap-2.5 text-ink">
    <span className="w-9 h-9 rounded-[10px] bg-brand text-white flex items-center justify-center"><Icon name="shield" className="w-5 h-5" /></span>
    <span className="h-display text-[22px]">Firsthand</span>
  </Link>
);

export async function Header() {
  const { user, otpPreview } = await getMe().catch(() => ({ user: null, otpPreview: false }));
  const links: [string, string][] = user
    ? [["/explore", "Explore"], ["/me/bookings", "Bookings"], ["/me/wallet", "Earnings"], ["/me/messages", user.unread ? `Messages (${user.unread})` : "Messages"], ["/me/saved", "Saved"]]
    : [["/explore", "Explore"], ["/trust", "How verification works"], ["/for-business", "For businesses"]];
  if (user && user.businessIds.length) links.push(["/merchant", "My business"]);
  if (user?.isAdmin) links.push(["/admin", "Admin"]);
  const nav = links.map(([h, t]) => <Link key={h} href={h} className="py-2.5 text-ink hover:text-brand">{t}</Link>);
  const right = user ? (
    <>
      <Link href="/share" className="btn btn-primary">Share an experience</Link>
      <Link href={user.handle ? `/u/${user.handle}` : "/me/settings"} className="flex items-center gap-2 font-semibold text-[15px]" aria-label="Your profile"><Avatar i={user.initials} /><span className="hidden xl:inline">{user.name?.split(" ")[0]}</span></Link>
    </>
  ) : (
    <>
      <Link href="/signin" className="btn btn-ghost">Sign in</Link>
      <Link href="/share" className="btn btn-primary">Share an experience</Link>
    </>
  );
  return (
    <>
      {otpPreview && (
        <div className="bg-ink text-[#F3EFE6] text-[13px]"><div className="wrap py-1.5 flex flex-wrap gap-x-3 justify-between"><span>Pilot preview · listings and people are sample data</span><span className="text-[#C9D3D0]">Sign-in codes appear on screen until email sending is connected</span></div></div>
      )}
      <header className="bg-paper border-b border-line sticky top-0 z-30">
        <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <Logo />
          <nav aria-label="Main" className="hidden lg:flex items-center gap-5 text-[15px] font-medium flex-1">{nav}</nav>
          <div className="hidden lg:flex items-center gap-2.5">{right}</div>
          <MenuButton>
            <nav aria-label="Mobile" className="flex flex-col text-[15px] font-medium">{nav}
              {user && <Link href="/me/settings" className="py-2.5">Settings</Link>}
              <div className="flex flex-wrap items-center gap-2.5 pt-3">{right}{user && <LogoutButton />}</div>
            </nav>
          </MenuButton>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  const col = (title: string, items: [string, string][]) => (
    <div className="flex flex-col gap-2"><strong className="font-semibold">{title}</strong>{items.map(([h, t]) => <Link key={t} className="text-muted hover:text-brand" href={h}>{t}</Link>)}</div>
  );
  return (
    <footer className="bg-cream border-t border-line mt-auto">
      <div className="wrap py-12 flex flex-col gap-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-[14.5px]">
          <div className="flex flex-col gap-2.5"><span className="h-display text-xl">Firsthand</span><span className="text-muted">Real experiences. Trusted recommendations. Shared earnings.</span></div>
          {col("Explore", [["/explore", "All verified experiences"], ["/explore?cat=salon", "Salons & spas"], ["/explore?cat=stay", "Stays"]])}
          {col("Trust", [["/trust", "How verification works"], ["/trust#ratings", "How profiles are rated"], ["/legal", "Terms, privacy & disclosures"]])}
          {col("Business & team", [["/for-business", "List your business"], ["/merchant", "Merchant portal"], ["/admin", "Admin console"]])}
        </div>
        <div className="border-t border-line pt-5 text-[13px] text-faint flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} Firsthand (working name) · a Decyb Technology venture</span>
          <span>Recommenders disclose every commission. Businesses can’t pay to remove reviews.</span>
        </div>
      </div>
    </footer>
  );
}
