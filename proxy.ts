import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Staging gate. Active only while STAGING_PASSWORD is set, so production
 * stays public by simply leaving the var unset.
 */
function stagingGate(request: NextRequest) {
  const password = process.env.STAGING_PASSWORD;
  if (!password) return null;

  const user = process.env.STAGING_USER ?? "ppl";
  const header = request.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    const [suppliedUser, ...rest] = atob(header.slice(6)).split(":");
    if (suppliedUser === user && safeEqual(rest.join(":"), password)) return null;
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ppl staging", charset="UTF-8"',
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

/** Length-independent comparison so a wrong guess leaks no timing signal. */
function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i % b.length);
  return diff === 0;
}

export async function proxy(request: NextRequest) {
  const blocked = stagingGate(request);
  if (blocked) return blocked;

  const path = request.nextUrl.pathname;
  const response =
    path.startsWith("/admin") || path === "/login"
      ? await updateSession(request)
      : NextResponse.next({ request });

  // Keep search engines out of the staging deployment entirely.
  if (process.env.STAGING_PASSWORD) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  // Everything except static assets and image optimisation output.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)"],
};
