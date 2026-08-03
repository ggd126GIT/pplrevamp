import { NextResponse } from "next/server";
import { issueFormToken } from "@/lib/formToken";

/**
 * Issues the signed timestamp the public forms post back with a submission.
 *
 * Must never be cached: a shared token would hand every visitor the same issue
 * time, and once that timestamp aged past the maximum every form on the site
 * would start rejecting real submissions.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { token: issueFormToken() },
    { headers: { "cache-control": "no-store" } },
  );
}
