import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import { clientIdentityHeaders, upstreamBase } from "@/lib/server/upstream";

/**
 * Exchanges credentials for a session cookie.
 *
 * The whole exchange happens on the server. The browser sends an email and a
 * password and receives a profile plus a Set-Cookie it cannot read — the token
 * itself is never part of a response body, so there is no point at which
 * client JS holds it and no way for an injected script to read it back.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (status: number, message: string) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(request: NextRequest) {
  const base = upstreamBase("main");
  if (!base) {
    return fail(500, "The API base URL is not configured on the server.");
  }

  let credentials: { email?: unknown; password?: unknown };
  try {
    credentials = await request.json();
  } catch {
    return fail(400, "Expected a JSON body.");
  }

  const { email, password } = credentials;
  if (typeof email !== "string" || typeof password !== "string") {
    return fail(400, "Email and password are required.");
  }

  const forwarded = clientIdentityHeaders(
    request.headers.get("x-forwarded-for"),
  );

  let token: string;
  try {
    const loginResponse = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...forwarded },
      // deviceId identifies the session server-side; the panel has always
      // reported itself as "web-pc".
      body: JSON.stringify({ email, password, deviceId: "web-pc" }),
      cache: "no-store",
    });

    const loginBody = await loginResponse.json().catch(() => null);

    if (!loginResponse.ok || !loginBody?.success || !loginBody?.token) {
      // Pass the API's own status through — a 429 from the auth rate limiter
      // has to stay a 429, otherwise the panel reports "invalid credentials"
      // for a lockout and the operator retries into a longer one.
      return fail(
        loginResponse.ok ? 401 : loginResponse.status,
        loginBody?.message ?? "Login failed.",
      );
    }

    token = loginBody.token;
  } catch (error) {
    console.error("Login request to the API failed:", error);
    return fail(502, "The API could not be reached.");
  }

  // The role check has to happen before the cookie is issued. It ran in the
  // browser before, after the token was already in hand.
  let user: unknown;
  try {
    const profileResponse = await fetch(`${base}/api/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...forwarded,
      },
      cache: "no-store",
    });

    const profileBody = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok || !profileBody?.success || !profileBody?.user) {
      return fail(502, "Signed in, but the profile could not be loaded.");
    }

    if (profileBody.user.role !== "ADMIN") {
      return fail(403, "ADMIN role not found. Access denied.");
    }

    user = profileBody.user;
  } catch (error) {
    console.error("Profile request to the API failed:", error);
    return fail(502, "The API could not be reached.");
  }

  const response = NextResponse.json({ success: true, user });
  response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
  return response;
}
