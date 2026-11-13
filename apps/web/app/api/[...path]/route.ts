import type { NextRequest } from "next/server";

const API = process.env.API_INTERNAL_URL || "http://127.0.0.1:4000";
const PASS_REQ = ["cookie", "content-type", "user-agent", "accept"];
const PASS_RES = ["content-type", "cache-control", "content-disposition"];

/** Same-origin proxy so the browser only ever talks to firsthand.decyb.com and session cookies stay first-party. */
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.some((p) => p === ".." || p.includes("\\"))) return new Response("Bad path", { status: 400 });
  const url = `${API}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const h of PASS_REQ) { const v = req.headers.get(h); if (v) headers.set(h, v); }
  const fwd = req.headers.get("x-forwarded-for"); if (fwd) headers.set("x-forwarded-for", fwd);
  const hasBody = !["GET", "HEAD"].includes(req.method);
  let res: Response;
  try {
    res = await fetch(url, { method: req.method, headers, body: hasBody ? req.body : undefined, redirect: "manual", cache: "no-store", ...(hasBody ? { duplex: "half" } : {}) } as RequestInit);
  } catch {
    return Response.json({ error: { code: "api_unreachable", message: "We couldn't reach the server. Please try again." } }, { status: 502 });
  }
  const out = new Headers();
  for (const h of PASS_RES) { const v = res.headers.get(h); if (v) out.set(h, v); }
  for (const c of res.headers.getSetCookie()) out.append("set-cookie", c);
  return new Response(res.body, { status: res.status, headers: out });
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
export const dynamic = "force-dynamic";
