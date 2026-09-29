// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

/**
 * app/api/auth/login/route.ts:90 is the only role check in the admin panel.
 * Everything behind it — every page, every write, every export of customer
 * data — is reachable by whoever holds the cookie this route issues. So the
 * gate gets its own suite, exercised from both sides and against the shapes a
 * `role` field can actually arrive in.
 */

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const request = () =>
  new NextRequest("https://admin.example.com/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "a@b.com", password: "pw" }),
  });

/** The API accepts the password; the profile it then returns carries `role`. */
const signInAs = (role: unknown) => {
  fetchMock
    .mockResolvedValueOnce(json({ success: true, token: "real-token" }))
    .mockResolvedValueOnce(
      json({ success: true, user: { id: 1, email: "a@b.com", role } }),
    );
  return POST(request());
};

describe("only an ADMIN gets a session", () => {
  it("issues the cookie for exactly ADMIN", async () => {
    const response = await signInAs("ADMIN");

    expect(response.status).toBe(200);
    expect(response.cookies.get("auth_token")?.value).toBe("real-token");
  });

  it.each([
    ["MODERATOR", "the next role down"],
    ["USER", "an ordinary account"],
    ["SUPERADMIN", "a role that merely contains ADMIN"],
    ["ADMINISTRATOR", "a longer role starting with ADMIN"],
    ["admin", "the same word in lower case"],
    ["Admin", "the same word in title case"],
    [" ADMIN", "a leading space"],
    ["ADMIN ", "a trailing space"],
    ["ADMIN\n", "a trailing newline"],
    ["", "an empty role"],
  ])("refuses %o — %s", async (role) => {
    const response = await signInAs(role);

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 1],
    ["a boolean", true],
    ["an array containing ADMIN", ["ADMIN"]],
    ["an object", { role: "ADMIN" }],
  ])("refuses a role that is %s", async (_label, role) => {
    const response = await signInAs(role);

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("says why, so the operator is not left guessing at a blank login", async () => {
    const response = await signInAs("USER");

    expect(await response.json()).toEqual({
      success: false,
      message: "ADMIN role not found. Access denied.",
    });
  });

  it("does not leak the profile of the account it just refused", async () => {
    const response = await signInAs("USER");

    expect(await response.text()).not.toContain("a@b.com");
  });

  it("does not leak the token of the account it just refused", async () => {
    const response = await signInAs("USER");

    expect(await response.text()).not.toContain("real-token");
  });

  it("checks the role even though the password was correct", async () => {
    // The API authenticated the credentials and minted a token; the panel
    // still refuses. Authentication is not authorisation.
    const response = await signInAs("MODERATOR");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(403);
  });

  it("does not fall back to a session when the profile omits a role entirely", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: true, token: "real-token" }))
      .mockResolvedValueOnce(json({ success: true, user: { id: 1 } }));

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses when the profile call 200s with no user at all", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: true, token: "real-token" }))
      .mockResolvedValueOnce(json({ success: true }));

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
    // Named, so this is distinguishable from the transport 502 that a crash
    // on `profileBody.user.role` would also produce.
    expect((await response.json()).message).toBe(
      "Signed in, but the profile could not be loaded.",
    );
  });

  it("reads the role from the API's profile, not from the login response", async () => {
    // A login body that claims ADMIN must not be able to talk its way past a
    // profile that says otherwise.
    fetchMock
      .mockResolvedValueOnce(
        json({ success: true, token: "real-token", user: { role: "ADMIN" } }),
      )
      .mockResolvedValueOnce(
        json({ success: true, user: { id: 1, email: "a@b.com", role: "USER" } }),
      );

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
