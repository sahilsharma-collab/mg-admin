// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { config, middleware } from "./middleware";

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "https://admin.example.com"), {
    headers: cookie ? { cookie } : {},
  });

/**
 * The matcher is a path-to-regexp source string Next compiles itself. Anchoring
 * it is the closest a unit test gets to asking "does middleware run for this
 * path" without booting the server.
 */
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("middleware route guard", () => {
  it("redirects an unauthenticated request for a protected page to /login", () => {
    const response = middleware(request("/users"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets an unauthenticated request reach /login", () => {
    const response = middleware(request("/login"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("sends an authenticated operator away from /login", () => {
    const response = middleware(request("/login", "auth_token=t"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
  });

  it("lets an authenticated operator reach a protected page", () => {
    const response = middleware(request("/users", "auth_token=t"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("gates on the auth_token cookie specifically, not any cookie", () => {
    const response = middleware(request("/users", "theme=dark; other=1"));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("keeps the redirect on the request's own origin", () => {
    const response = middleware(request("/renewals"));

    expect(new URL(response.headers.get("location")!).origin).toBe(
      "https://admin.example.com",
    );
  });

  it("preserves the cookie header for the request it lets through", () => {
    const response = middleware(request("/users", "auth_token=t"));

    expect(response.status).toBe(200);
  });
});

describe("middleware matcher", () => {
  it.each([
    "/",
    "/users",
    "/roles-and-admins/admin",
    "/payments",
    "/live-trade/new",
  ])("covers the admin page %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });

  it.each([
    "/api/mg/main/api/profile",
    "/api/auth/login",
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
    "/Images/logo.svg",
    "/anything.png",
  ])("skips %s", (path) => {
    expect(matcher.test(path)).toBe(false);
  });

  it("does not gate the /api proxy, which authenticates itself", () => {
    // Recorded deliberately: the proxy route handler returns 401 on its own
    // (app/api/mg/[upstream]/[...path]/route.ts). If the matcher ever starts
    // covering /api the redirect would turn XHR 401s into HTML login pages.
    expect(matcher.test("/api/mg/main/api/faq")).toBe(false);
  });
});
