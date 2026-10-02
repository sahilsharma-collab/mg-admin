// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { get: vi.fn() };
const headerStore = { get: vi.fn() };

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
  headers: async () => headerStore,
}));

import { getSessionUser } from "./session";

const ENV_KEYS = [
  "API_BASE_URL",
  "NEXT_PUBLIC_PROD_URL",
  "ADMIN_PROXY_SECRET",
] as const;
const saved: Record<string, string | undefined> = {};

const profile = (body: unknown, status = 200) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;

const signedIn = (token = "tok") => cookieStore.get.mockReturnValue({ value: token });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env.API_BASE_URL = "https://api.example.com";

  cookieStore.get.mockReturnValue(undefined);
  headerStore.get.mockReturnValue(null);

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("getSessionUser", () => {
  it("is null with no cookie, and spends no request finding out", async () => {
    await expect(getSessionUser()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the same cookie middleware and the proxy gate on", async () => {
    signedIn();
    fetchMock.mockResolvedValue(
      profile({ success: true, user: { email: "a@b.com", role: "ADMIN" } }),
    );

    await getSessionUser();

    expect(cookieStore.get).toHaveBeenCalledWith("auth_token");
  });

  it("spends the token as a bearer header, server-side", async () => {
    signedIn("secret-token");
    fetchMock.mockResolvedValue(
      profile({ success: true, user: { email: "a@b.com", role: "ADMIN" } }),
    );

    await getSessionUser();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/profile");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-token",
    );
    expect(init.cache).toBe("no-store");
  });

  it("forwards the real client address when a proxy secret is configured", async () => {
    process.env.ADMIN_PROXY_SECRET = "s3cret";
    headerStore.get.mockReturnValue("1.1.1.1, 203.0.113.4");
    signedIn();
    fetchMock.mockResolvedValue(
      profile({ success: true, user: { email: "a@b.com", role: "ADMIN" } }),
    );

    await getSessionUser();

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["x-mg-client-ip"]).toBe("203.0.113.4");
    expect(headers["x-mg-proxy-secret"]).toBe("s3cret");
  });

  it("returns the profile the API reports", async () => {
    signedIn();
    fetchMock.mockResolvedValue(
      profile({
        success: true,
        user: { id: 7, email: "anish@boomingbulls.com", role: "ADMIN" },
      }),
    );

    await expect(getSessionUser()).resolves.toMatchObject({
      email: "anish@boomingbulls.com",
      role: "ADMIN",
    });
  });

  it.each([401, 403])("treats %i as signed out, not as an error", async (status) => {
    signedIn();
    fetchMock.mockResolvedValue(profile({ success: false }, status));

    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("throws on a 500 rather than reporting the operator as signed out", async () => {
    // Null becomes a redirect to /login, and middleware sends anyone holding a
    // cookie straight back — an API outage would loop instead of erroring.
    signedIn();
    fetchMock.mockResolvedValue(profile({ success: false }, 500));

    await expect(getSessionUser()).rejects.toThrow(/could not be loaded \(500\)/);
  });

  it("throws when the API base URL is not configured", async () => {
    delete process.env.API_BASE_URL;
    signedIn();

    await expect(getSessionUser()).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when the API is unreachable", async () => {
    signedIn();
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(getSessionUser()).rejects.toThrow("ECONNREFUSED");
  });

  it.each([
    ["an unsuccessful body", { success: false, user: { email: "a@b.com", role: "ADMIN" } }],
    ["no user", { success: true }],
    ["no email", { success: true, user: { role: "ADMIN" } }],
    ["a non-string email", { success: true, user: { email: 1, role: "ADMIN" } }],
    ["no role", { success: true, user: { email: "a@b.com" } }],
  ])("throws on %s instead of silently revoking every permission", async (_label, body) => {
    signedIn();
    fetchMock.mockResolvedValue(profile(body));

    await expect(getSessionUser()).rejects.toThrow(/expected shape/);
  });

  it("throws rather than guessing when the body is not JSON at all", async () => {
    signedIn();
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(getSessionUser()).rejects.toThrow(/expected shape/);
  });
});
