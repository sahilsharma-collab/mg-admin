import { cookies, headers } from "next/headers";

import { AUTH_COOKIE } from "@/lib/auth-cookie";
import { clientIdentityHeaders, upstreamBase } from "@/lib/server/upstream";

/**
 * The signed-in operator, read on the server from the session cookie.
 *
 * The cookie is an opaque bearer token the API issued; nothing in this repo can
 * read a claim out of it, so the only way to learn who the caller is server-side
 * is to spend the token on /api/profile. That is why the permission check lives
 * in the pages rather than in middleware: middleware runs on every matched
 * navigation, and putting a network round trip there would make the API's
 * availability the panel's availability.
 *
 * The token never leaves the server half. It is read from an httpOnly cookie
 * and attached as a header here, exactly as the proxy does it.
 */

export interface SessionUser {
  readonly email: string;
  readonly role: string;
  readonly id?: number | string;
  readonly name?: string;
}

/**
 * Resolves the caller's profile, or null when there is no live session.
 *
 * Deliberately not memoised with React's `cache`: one guard runs per render
 * today, and a stale memo on a security decision is a worse trade than a second
 * fetch would be. Wrap it if a render ever needs the profile twice.
 *
 * Null means "signed out" and nothing else. A misconfiguration or an unreachable
 * API throws instead, because the caller turns null into a redirect to /login —
 * and a redirect loop is what an outage would otherwise look like, since
 * middleware sends anyone holding a cookie away from /login again.
 */
export const getSessionUser = async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const base = upstreamBase("main");
  if (!base) {
    throw new Error("The API base URL is not configured on the server.");
  }

  const forwarded = clientIdentityHeaders(
    (await headers()).get("x-forwarded-for"),
  );

  const response = await fetch(`${base}/api/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...forwarded,
    },
    cache: "no-store",
  });

  // A rejected token is an expired or revoked session, which is the ordinary
  // signed-out case.
  if (response.status === 401 || response.status === 403) return null;

  if (!response.ok) {
    throw new Error(`The profile could not be loaded (${response.status}).`);
  }

  const body = await response.json().catch(() => null);
  if (
    !body?.success ||
    !body?.user ||
    typeof body.user.email !== "string" ||
    typeof body.user.role !== "string"
  ) {
    // Fail loudly rather than returning a profile with no email, which
    // permissionsFor would correctly read as "holds nothing" — turning a
    // malformed response into a silent revocation of a finance operator.
    throw new Error("The profile response was not in the expected shape.");
  }

  return body.user as SessionUser;
};
