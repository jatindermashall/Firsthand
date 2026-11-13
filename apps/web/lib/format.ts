import type { Tier } from "./types";
const TZ = "Asia/Kolkata";
export const inr = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: paise % 100 ? 2 : 0, minimumFractionDigits: paise % 100 ? 2 : 0 });
export const date = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) => d ? new Date(d).toLocaleDateString("en-IN", { timeZone: TZ, ...opts }) : "";
export const time = (d: string | Date) => new Date(d).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
export const dateTime = (d: string | Date) => `${date(d, { weekday: "short", day: "numeric", month: "short" })}, ${time(d)}`;
export const monthYear = (d: string | Date | null) => date(d, { month: "short", year: "numeric" });
export function ago(d: string | Date | null) {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  if (days < 1) return "today"; if (days < 2) return "yesterday"; if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`; return `${Math.floor(days / 30)} months ago`;
}
export const CATEGORY: Record<string, string> = { salon: "Salons & spas", stay: "Stays", wellness: "Wellness", activity: "Activities", food: "Restaurant packages" };
export const CATEGORY_ONE: Record<string, string> = { salon: "Salon", stay: "Stay", wellness: "Wellness", activity: "Activity", food: "Restaurant package" };
export const LEVEL: Record<number, { text: string; cls: string }> = {
  3: { text: "Stay confirmed by the booking partner", cls: "bg-ink text-white" },
  2: { text: "Visit confirmed by the business", cls: "bg-brand-soft text-brand-dark" },
  1: { text: "Booking reviewed", cls: "bg-white border border-[#D9D2C3] text-muted" },
  0: { text: "Unverified", cls: "bg-sand text-muted" },
};
export const TIER: Record<Tier, { text: string; cls: string; help: string }> = {
  top: { text: "Top Guide", cls: "bg-brand text-white", help: "Highly accurate across many verified visits" },
  trusted: { text: "Trusted", cls: "bg-brand-soft text-brand-dark", help: "Visitors consistently say their advice matched reality" },
  rising: { text: "Rising", cls: "bg-sand text-ink", help: "Has a Trust Score; still building a track record" },
  new: { text: "New", cls: "bg-white border border-line text-muted", help: "Not enough ratings yet to show a score" },
};
