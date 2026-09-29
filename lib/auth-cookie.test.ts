// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { AUTH_COOKIE, authCookieOptions } from "./auth-cookie";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session cookie options", () => {
  it("is named auth_token, which is what middleware reads", () => {
    expect(AUTH_COOKIE).toBe("auth_token");
  });

  it("is httpOnly, so no script on the admin origin can read the token", () => {
    expect(authCookieOptions().httpOnly).toBe(true);
  });

  it("is sameSite strict, so a cross-site POST carries no session", () => {
    expect(authCookieOptions().sameSite).toBe("strict");
  });

  it("is scoped to the whole origin so every route sees it", () => {
    expect(authCookieOptions().path).toBe("/");
  });

  it("expires with the one-day access token the API issues", () => {
    expect(authCookieOptions().maxAge).toBe(60 * 60 * 24);
  });

  it("is Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(authCookieOptions().secure).toBe(true);
  });

  it("is not Secure in development, where the panel is plain HTTP", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(authCookieOptions().secure).toBe(false);
  });
});
