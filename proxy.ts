import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on admin + login only; skip static assets and public pages.
  matcher: ["/admin/:path*", "/login"],
};
