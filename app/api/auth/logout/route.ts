import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { clientIdentityHeaders, upstreamBase } from "@/lib/server/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Revokes the session server-side and clears the cookie.
 *
 * The cookie is cleared whatever the API says. Leaving a signed-out operator
 * holding a cookie because the revocation call failed is the worse outcome of
 * the two: the UI would still consider them signed in. The response reports
 * whether the server side actually succeeded so the client can say so.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const base = upstreamBase("main");
  let revoked = false;

  if (token && base) {
    try {
      const response = await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...clientIdentityHeaders(request.headers.get("x-forwarded-for")),
        },
        cache: "no-store",
      });
      revoked = response.ok;
    } catch (error) {
      console.error("Server-side logout failed:", error);
    }
  }

  const response = NextResponse.json({ success: true, revoked });
  // maxAge 0 with the same attributes the cookie was set with — a delete that
  // differs in path or sameSite leaves the original in place.
  response.cookies.set(AUTH_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
  return response;
}
