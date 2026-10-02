// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

const BASE = "https://api.example.com";
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_BASE_URL", BASE);
  vi.stubEnv("NEXT_PUBLIC_PROD_URL", "");
  vi.stubEnv("ADMIN_PROXY_SECRET", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const logoutRequest = (cookie?: string) =>
  new NextRequest("https://admin.example.com/api/auth/logout", {
    method: "POST",
    headers: cookie ? { cookie } : {},
  });

const cleared = (response: { headers: Headers }) => {
  const header = response.headers.get("set-cookie") ?? "";
  return /auth_token=;/.test(header) && /max-age=0/i.test(header);
};

describe("POST /api/auth/logout", () => {
  it("revokes the session at the API with the cookie's token", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await POST(logoutRequest("auth_token=tok"));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/auth/logout`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("reports the revocation so the client can tell the operator", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await POST(logoutRequest("auth_token=tok"));

    expect(await response.json()).toEqual({ success: true, revoked: true });
  });

  it("clears the cookie on a successful revocation", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await POST(logoutRequest("auth_token=tok"));

    expect(cleared(response)).toBe(true);
  });

  it("clears the cookie even when the API refuses the revocation", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    const response = await POST(logoutRequest("auth_token=tok"));

    expect(cleared(response)).toBe(true);
    expect((await response.json()).revoked).toBe(false);
  });

  it("clears the cookie even when the API is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await POST(logoutRequest("auth_token=tok"));

    expect(cleared(response)).toBe(true);
    expect((await response.json()).revoked).toBe(false);
  });

  it("clears the cookie, and calls nothing, when there is no session to revoke", async () => {
    const response = await POST(logoutRequest());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(cleared(response)).toBe(true);
  });

  it("deletes with the attributes the cookie was set with, or the original survives", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const header = (await POST(logoutRequest("auth_token=tok"))).headers
      .get("set-cookie")!
      .toLowerCase();

    expect(header).toContain("path=/");
    expect(header).toContain("httponly");
    expect(header).toContain("samesite=strict");
  });

  it("identifies the real client to the API's rate limiter", async () => {
    vi.stubEnv("ADMIN_PROXY_SECRET", "s3cret");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const request = new NextRequest("https://admin.example.com/api/auth/logout", {
      method: "POST",
      headers: { cookie: "auth_token=tok", "x-forwarded-for": "1.1.1.1, 203.0.113.4" },
    });
    await POST(request);

    expect(fetchMock.mock.calls[0][1].headers["x-mg-client-ip"]).toBe("203.0.113.4");
  });
});
