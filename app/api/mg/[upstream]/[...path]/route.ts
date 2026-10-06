import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth-cookie";
import {
  clientIdentityHeaders,
  isUpstream,
  upstreamBase,
} from "@/lib/server/upstream";

/**
 * Authenticated proxy to the backend APIs.
 *
 * The admin panel used to attach `Authorization: Bearer <token>` in component
 * code, which required the token to be readable by JS, which ruled out an
 * httpOnly cookie. Reversing that: the browser sends only the cookie, this
 * handler reads it server-side and attaches the header. The token never enters
 * the JS heap, so an injected script on the admin origin cannot exfiltrate it.
 */

export const dynamic = "force-dynamic";
// Reading cookies and streaming an arbitrary upstream response are Node APIs.
export const runtime = "nodejs";

// Hop-by-hop headers, plus the ones the caller does not get to decide.
const DROP_FROM_REQUEST = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  // Recomputed by fetch from the body we actually send.
  "content-length",
  "host",
  // The admin session cookie is for this origin only. Forwarding it would hand
  // the API a credential it has no use for and should never see.
  "cookie",
  // Set from the cookie below. Accepting a caller-supplied value would let any
  // script choose the identity the proxy authenticates as, which is the exact
  // hole this change exists to close.
  "authorization",
  // The API resolves req.ip through `trust proxy 1`, so it reads the rightmost
  // entry of this header. Passing the browser's chain through would leave the
  // attacker-controlled portion in place; the real client address travels in a
  // dedicated header below instead.
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  // Set below from clientIdentityHeaders, for the same reason `authorization`
  // is. The overwrite there only happens when a secret is configured *and* an
  // x-forwarded-for is present; when either is missing, `clientIdentityHeaders`
  // returns {} and a caller-supplied pair would otherwise be relayed to the API
  // untouched — including from an unauthenticated caller on a PUBLIC_PATH. The
  // API honours x-mg-client-ip whenever x-mg-proxy-secret matches, so this is
  // the one header pair the caller must never get to speak for.
  "x-mg-proxy-secret",
  "x-mg-client-ip",
]);

// `fetch` transparently decompresses, so the upstream's encoding headers no
// longer describe the bytes we are about to forward. Passing them through
// hands the browser gzip headers on plain text.
const DROP_FROM_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  // The API has no business setting cookies on the admin origin.
  "set-cookie",
]);

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

// Set on any response where a *presented* session was rejected (missing cookie
// on a protected path, or a token the API answered 401 to). middleware.ts gates
// on the cookie's presence alone, so without a signal the browser stays on a
// page that looks logged in while every write 401s. The api client in
// lib/api.ts reads this and redirects to /login. A validation 401 on a public
// path (a wrong reset code) never carries it, so it never bounces that caller.
const SESSION_EXPIRED_HEADER = "x-mg-auth-expired";

// The two endpoints the login page reaches before a session exists. Someone
// who has forgotten their password has no cookie by definition, so requiring
// one here would make password reset unreachable.
//
// Kept as an explicit closed set rather than a prefix match: this is the only
// way to use the proxy without authenticating, and an attacker relaying
// through it would otherwise reach the API as this server. The forwarded
// client address below is what keeps the API's rate limiter accurate for
// these — they are exactly the endpoints worth brute-forcing.
const PUBLIC_PATHS = new Set([
  "main:api/auth/forgot-password",
  "main:api/auth/reset-password",
]);

const json = (status: number, message: string) =>
  NextResponse.json({ success: false, message }, { status });

/**
 * Builds the upstream URL from a fixed base and caller-supplied segments.
 *
 * Every segment is percent-encoded before joining. This is load-bearing: an
 * unencoded segment of "https:" would make the joined path an absolute URL and
 * `new URL(path, base)` would resolve it against a host of the caller's
 * choosing. The origin equality check afterwards is the backstop.
 */
const buildUpstreamUrl = (base: string, segments: string[], search: string) => {
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return undefined;
  }

  const path = segments.map(encodeURIComponent).join("/");
  const url = new URL(`${base}/${path}${search}`);

  if (url.origin !== new URL(base).origin) return undefined;
  return url;
};

const proxy = async (
  request: NextRequest,
  context: { params: Promise<{ upstream: string; path?: string[] }> },
) => {
  const { upstream, path = [] } = await context.params;

  if (!isUpstream(upstream)) {
    return json(404, "Unknown upstream.");
  }

  const base = upstreamBase(upstream);
  if (!base) {
    // Deploy-time misconfiguration. Say so plainly rather than emitting a
    // request to "undefined/api/..." and reporting whatever that fails with.
    return json(
      500,
      `The ${upstream} API base URL is not configured on the server.`,
    );
  }

  const isPublic = PUBLIC_PATHS.has(`${upstream}:${path.join("/")}`);
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token && !isPublic) {
    const res = json(401, "Not authenticated.");
    res.headers.set(SESSION_EXPIRED_HEADER, "1");
    return res;
  }

  const url = buildUpstreamUrl(base, path, request.nextUrl.search);
  if (!url) {
    return json(400, "Invalid request path.");
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_FROM_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });
  if (token) headers.set("authorization", `Bearer ${token}`);

  // Ask the upstream for an uncompressed body. We strip content-encoding from
  // the response (DROP_FROM_RESPONSE) on the assumption that fetch has already
  // decompressed it — but that only holds for encodings this runtime's fetch
  // understands. On production the upstream (behind Cloudflare) answered with
  // brotli that the server's Node did not decompress, so a header-less but still
  // compressed body reached the browser as binary garbage. Forcing identity
  // makes the body plain on every host, so the strip is always correct.
  headers.set("accept-encoding", "identity");

  for (const [key, value] of Object.entries(
    clientIdentityHeaders(request.headers.get("x-forwarded-for")),
  )) {
    headers.set(key, value);
  }

  const method = request.method.toUpperCase();

  let body: ArrayBuffer | undefined;
  if (!METHODS_WITHOUT_BODY.has(method)) {
    // Buffered rather than streamed: streaming a request body needs
    // `duplex: "half"`, and the payloads here are form posts and profile
    // images. Multipart survives because the content-type header, boundary
    // included, is forwarded untouched.
    body = await request.arrayBuffer();
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(url, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error) {
    console.error(`Proxy request to ${upstream} failed:`, error);
    return json(502, "The upstream API could not be reached.");
  }

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!DROP_FROM_RESPONSE.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });

  // A rejected token means the cookie is worthless, and middleware.ts routes
  // on the cookie's *presence* alone. Left in place, an expired session bounces
  // between / and /login forever: middleware sends an operator with a cookie
  // away from /login, and every request behind it answers 401. Clearing it
  // here turns that into a clean redirect to the login form.
  // Only when a token was actually presented — a 401 from a public endpoint
  // (a wrong reset code, say) says nothing about the caller's session.
  if (token && upstreamResponse.status === 401) {
    response.cookies.set(AUTH_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
    // A dead session, not an ordinary 401: let the client redirect to /login
    // rather than surface a silent write failure.
    response.headers.set(SESSION_EXPIRED_HEADER, "1");
  }

  return response;
};

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
};
