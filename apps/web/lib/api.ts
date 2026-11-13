import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

export const API = process.env.API_INTERNAL_URL || "http://127.0.0.1:4000";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

/** Server-side call to the API, forwarding the visitor's session cookie. */
export async function api<T>(path: string, opts: { allow404?: boolean } = {}): Promise<T> {
  const jar = await cookies();
  const res = await fetch(API + path, { headers: { cookie: jar.toString(), accept: "application/json" }, cache: "no-store" });
  if (res.status === 404 && !opts.allow404) notFound();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}

export type Me = { otpPreview: boolean; user: null | { id: number; email: string; name: string | null; handle: string | null; city: string | null; bio: string | null; openForQuestions: boolean; initials: string; isAdmin: boolean; businessIds: number[]; unread: number } };
export const getMe = () => api<Me>("/me");
