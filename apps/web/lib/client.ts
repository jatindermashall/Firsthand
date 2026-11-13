"use client";
/** Browser call to the API through the same-origin /api proxy. Throws an Error with a readable message. */
export async function call<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch("/api" + path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: body === undefined || isForm ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Something went wrong. Please try again.");
  return data as T;
}
