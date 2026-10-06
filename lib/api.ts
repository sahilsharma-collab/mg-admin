import axios, { isAxiosError } from "axios";

/**
 * The one place the admin panel talks to a backend.
 *
 * Component code used to read the session token out of a cookie and attach it
 * by hand, in 61 files. That is what forced the cookie to be readable by JS.
 * Everything here targets the same-origin proxy under /api/mg instead, which
 * attaches the token server-side from an httpOnly cookie — so no caller needs
 * the token, and none can reach it.
 *
 * Two upstreams exist: the main API and the VIP payments API. Callers pick one
 * by choosing a client, not by supplying a URL.
 */

const MAIN = "/api/mg/main";
const VIP = "/api/mg/vip";

/** Axios clients. Same interface as bare axios — `.data`, throws on non-2xx. */
export const api = axios.create({ baseURL: MAIN });
export const vipApi = axios.create({ baseURL: VIP });

/**
 * Redirect to /login when the proxy reports a dead session.
 *
 * The proxy (app/api/mg/[upstream]/[...path]/route.ts) clears the cookie on a
 * rejected session and tags the response with `x-mg-auth-expired`. middleware.ts
 * routes on the cookie's *presence* alone, so a request whose session died —
 * the token expired, an admin was blocked or demoted, Redis evicted it — leaves
 * the operator on a page that still looks logged in while every write 401s. That
 * is the "image upload failed for no reason" report. We bounce to /login on that
 * exact signal, and only that signal: an ordinary validation 401 (a wrong
 * password-reset code on a public path) never carries the header.
 */
const SESSION_EXPIRED_HEADER = "x-mg-auth-expired";
let redirectingToLogin = false;

const sessionExpired = (headerValue: unknown, status: number): boolean =>
  status === 401 && Boolean(headerValue);

const redirectToLogin = (): void => {
  if (typeof window === "undefined") return; // never during SSR
  if (redirectingToLogin) return; // one redirect even if many requests 401 at once
  if (window.location.pathname.startsWith("/login")) return; // no loop
  redirectingToLogin = true;
  window.location.assign("/login");
};

for (const client of [api, vipApi]) {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (
        isAxiosError(error) &&
        error.response &&
        sessionExpired(
          error.response.headers?.[SESSION_EXPIRED_HEADER],
          error.response.status,
        )
      ) {
        redirectToLogin();
      }
      return Promise.reject(error);
    },
  );
}

/**
 * Fetch wrappers. Same interface as bare fetch — returns a Response. A fetch
 * does not throw on 401, so the session-expiry check is applied here too, before
 * the Response is handed back.
 */
export const apiFetch = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${MAIN}${path}`, init);
  if (sessionExpired(response.headers.get(SESSION_EXPIRED_HEADER), response.status)) {
    redirectToLogin();
  }
  return response;
};

export const vipFetch = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${VIP}${path}`, init);
  if (sessionExpired(response.headers.get(SESSION_EXPIRED_HEADER), response.status)) {
    redirectToLogin();
  }
  return response;
};

type QueryValue = string | number | boolean | null | undefined;

/**
 * Appends a query string, skipping empty values.
 *
 * Replaces the `new URL(...)` plus conditional `searchParams.append` blocks the
 * call sites used to carry. Those needed an absolute URL to construct; paths
 * here are relative, and building one against window.location would break
 * server rendering.
 */
export const withQuery = (
  path: string,
  params: Record<string, QueryValue>,
): string => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.append(key, String(value));
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
};
