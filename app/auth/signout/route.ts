import { createClient } from "@/lib/supabase/server";

/**
 * Signing out sends the browser to /login via a **relative** Location.
 *
 * It previously built an absolute URL from `request.url`, which behind
 * `next start` does not carry the public host — production redirected people to
 * `https://localhost:3000/login`. nginx forwards the correct `Host`, so this is
 * not a proxy misconfiguration and cannot be fixed there.
 *
 * A relative Location is valid per RFC 7231 and resolved by the browser against
 * the address it actually requested, so it stays correct on the VPS, on Vercel,
 * on localhost and behind Cloudflare without depending on any header or env var.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return new Response(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
