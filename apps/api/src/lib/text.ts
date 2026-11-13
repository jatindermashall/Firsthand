import { randomBytes } from "node:crypto";

export function slugify(s: string, max = 80) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, max).replace(/-$/, "");
}
export const shortId = (n = 4) => randomBytes(8).toString("base64url").replace(/[-_]/g, "").slice(0, n).toLowerCase();

const PHONE = /(?:\+?\d[\s-]?){10,13}/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const LINK = /\b(?:wa\.me|whatsapp\.com|t\.me|instagram\.com)\/\S+/gi;

/** Hides phone numbers, emails and messaging links so bookings stay on Firsthand. */
export function maskContacts(body: string): { body: string; masked: boolean } {
  let masked = false;
  const out = body.replace(LINK, () => { masked = true; return "[contact hidden]"; })
    .replace(EMAIL, () => { masked = true; return "[contact hidden]"; })
    .replace(PHONE, (m) => { if (m.replace(/\D/g, "").length >= 10) { masked = true; return "[contact hidden]"; } return m; });
  return { body: out, masked };
}

export const initials = (name?: string | null) => (name ?? "").split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
export const lines = (s?: string | null) => (s ?? "").split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
