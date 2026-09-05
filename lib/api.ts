import axios from "axios";

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

/** Fetch wrappers. Same interface as bare fetch — returns a Response. */
export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(`${MAIN}${path}`, init);

export const vipFetch = (path: string, init?: RequestInit) =>
  fetch(`${VIP}${path}`, init);

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
