/**
 * Server-side resolution of the two backends the admin panel talks to.
 *
 * Client code no longer holds a backend origin at all: it calls the proxy at
 * /api/mg/<upstream>/... and this module decides where that goes. Keeping the
 * mapping to a closed set is what stops the proxy being an open redirector —
 * the upstream is chosen by name, never supplied as a URL.
 */

export const UPSTREAMS = ["main", "vip"] as const;
export type Upstream = (typeof UPSTREAMS)[number];

export const isUpstream = (value: string): value is Upstream =>
  (UPSTREAMS as readonly string[]).includes(value);

/**
 * Resolved at call time rather than module scope so a deployment can change
 * the target without a rebuild. The NEXT_PUBLIC_* values remain as fallbacks
 * because that is what is configured today; API_BASE_URL exists so the proxy
 * can be pointed at an internal address that is not published to the browser.
 */
/**
 * Headers that tell the API which client this request is really for.
 *
 * Everything the panel sends now originates from this server, so the API's
 * per-IP rate limiter would otherwise see one address for every admin and
 * count them against a single bucket. The secret is what makes the forwarded
 * address trustworthy: without it the API would be honouring a header any
 * caller could set, which is the flaw the limiter was fixed to remove.
 *
 * Returns nothing when no secret is configured, so a deployment that has not
 * set one degrades to shared-bucket behaviour rather than an open header.
 */
export const clientIdentityHeaders = (
  forwardedFor: string | null,
): Record<string, string> => {
  const secret = process.env.ADMIN_PROXY_SECRET;
  if (!secret) return {};

  // Rightmost entry: the address the load balancer in front of *this* server
  // observed. The entries to its left are supplied by the caller.
  const clientIp = forwardedFor?.split(",").pop()?.trim();
  if (!clientIp) return {};

  return { "x-mg-proxy-secret": secret, "x-mg-client-ip": clientIp };
};

export const upstreamBase = (upstream: Upstream): string | undefined => {
  const raw =
    upstream === "main"
      ? (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_PROD_URL)
      : (process.env.VIP_API_BASE_URL ?? process.env.NEXT_PUBLIC_VIP_URL);

  // A trailing slash here and a leading slash on the path would produce a
  // double slash, which some routers treat as a different path.
  return raw?.replace(/\/+$/, "") || undefined;
};
