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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const loginRequest = (
  body: unknown = { email: "a@b.com", password: "pw" },
  headers: Record<string, string> = {},
) =>
  new NextRequest("https://admin.example.com/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const adminProfile = { id: 1, email: "a@b.com", role: "ADMIN" };

/** Upstream answers login then profile, in that order. */
const respondWith = (
  login: Response,
  profile: Response = jsonResponse({ success: true, user: adminProfile }),
) => {
  fetchMock.mockResolvedValueOnce(login).mockResolvedValueOnce(profile);
};

describe("POST /api/auth/login", () => {
  it("refuses before contacting anything when no API base is configured", async () => {
    vi.stubEnv("API_BASE_URL", "");

    const response = await POST(loginRequest());

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(loginRequest("not json"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing password", { email: "a@b.com" }],
    ["a missing email", { password: "pw" }],
    ["a non-string password", { email: "a@b.com", password: { $ne: null } }],
    ["a non-string email", { email: ["a@b.com"], password: "pw" }],
  ])("rejects %s without reaching the API", async (_label, body) => {
    const response = await POST(loginRequest(body));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the credentials and the panel's deviceId to the API's login route", async () => {
    respondWith(jsonResponse({ success: true, token: "tok" }));

    await POST(loginRequest());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/auth/login`);
    expect(JSON.parse(init.body)).toEqual({
      email: "a@b.com",
      password: "pw",
      deviceId: "web-pc",
    });
  });

  it("issues the session cookie on success", async () => {
    respondWith(jsonResponse({ success: true, token: "tok" }));

    const response = await POST(loginRequest());

    expect(response.status).toBe(200);
    expect(response.cookies.get("auth_token")?.value).toBe("tok");
  });

  it("marks the session cookie HttpOnly on the wire", async () => {
    respondWith(jsonResponse({ success: true, token: "tok" }));

    const response = await POST(loginRequest());

    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("httponly");
  });

  it("never puts the token in the response body", async () => {
    respondWith(jsonResponse({ success: true, token: "super-secret-token" }));

    const response = await POST(loginRequest());

    expect(await response.text()).not.toContain("super-secret-token");
  });

  it("returns the profile so the client has a user without a second round trip", async () => {
    respondWith(jsonResponse({ success: true, token: "tok" }));

    const response = await POST(loginRequest());

    expect(await response.json()).toEqual({ success: true, user: adminProfile });
  });

  it("checks the role on the server, before the cookie exists", async () => {
    respondWith(
      jsonResponse({ success: true, token: "tok" }),
      jsonResponse({ success: true, user: { ...adminProfile, role: "MODERATOR" } }),
    );

    const response = await POST(loginRequest());

    expect(response.status).toBe(403);
    expect(response.cookies.get("auth_token")).toBeUndefined();
  });

  it.each(["USER", "moderator", "admin", ""])(
    "denies the role %o, which is not exactly ADMIN",
    async (role) => {
      respondWith(
        jsonResponse({ success: true, token: "tok" }),
        jsonResponse({ success: true, user: { ...adminProfile, role } }),
      );

      const response = await POST(loginRequest());

      expect(response.status).toBe(403);
      expect(response.headers.get("set-cookie")).toBeNull();
    },
  );

  it("passes the API's own status through, so a lockout stays a 429", async () => {
    respondWith(jsonResponse({ success: false, message: "Too many attempts" }, 429));

    const response = await POST(loginRequest());

    expect(response.status).toBe(429);
    expect((await response.json()).message).toBe("Too many attempts");
  });

  it("answers 401 when the API returns 200 without a token", async () => {
    respondWith(jsonResponse({ success: true }));

    const response = await POST(loginRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("answers 502 when the API cannot be reached", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await POST(loginRequest());

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
    // Stops at the failed login rather than carrying on to the profile call
    // with whatever `token` happens to hold.
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("answers 502, and sets no cookie, when the profile cannot be loaded", async () => {
    respondWith(
      jsonResponse({ success: true, token: "tok" }),
      jsonResponse({ success: false }, 500),
    );

    const response = await POST(loginRequest());

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
    // Distinguishes the profile refusal from a transport failure; without it
    // the assertion passes even when the profile body is never checked.
    expect((await response.json()).message).toBe(
      "Signed in, but the profile could not be loaded.",
    );
  });

  it("authenticates the profile lookup with the token it just received", async () => {
    respondWith(jsonResponse({ success: true, token: "tok" }));

    await POST(loginRequest());

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${BASE}/api/profile`);
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("reports the real client address to the API when a secret is configured", async () => {
    vi.stubEnv("ADMIN_PROXY_SECRET", "s3cret");
    respondWith(jsonResponse({ success: true, token: "tok" }));

    await POST(loginRequest(undefined, { "x-forwarded-for": "9.9.9.9, 203.0.113.4" }));

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-mg-client-ip"]).toBe("203.0.113.4");
    expect(init.headers["x-mg-proxy-secret"]).toBe("s3cret");
  });

  it("sends no identity headers when no secret is configured", async () => {
    respondWith(jsonResponse({ success: true, token: "tok" }));

    await POST(loginRequest(undefined, { "x-forwarded-for": "203.0.113.4" }));

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-mg-proxy-secret"]).toBeUndefined();
    expect(init.headers["x-mg-client-ip"]).toBeUndefined();
  });
});
