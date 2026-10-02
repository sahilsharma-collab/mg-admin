// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
vi.mock("./session", () => ({ getSessionUser: () => getSessionUser() }));

// Both of Next's interrupts throw; the real ones throw a framework-private
// signal, so stand-ins let a test tell the two outcomes apart by message.
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});
const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  redirect: (to: string) => redirect(to),
  notFound: () => notFound(),
}));

import { requirePermission, sessionPermissions } from "./guard";

const LISTED = { email: "anish@boomingbulls.com", role: "ADMIN" };
const OTHER_ADMIN = { email: "someone.else@boomingbulls.com", role: "ADMIN" };

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.REVENUE_ADMIN_EMAILS;
  delete process.env.REVENUE_ADMIN_EMAILS;
});

afterEach(() => {
  if (saved === undefined) delete process.env.REVENUE_ADMIN_EMAILS;
  else process.env.REVENUE_ADMIN_EMAILS = saved;
  vi.clearAllMocks();
});

describe("sessionPermissions", () => {
  it("reports what a listed operator holds", async () => {
    getSessionUser.mockResolvedValue(LISTED);

    await expect(sessionPermissions()).resolves.toEqual(["revenue:read"]);
  });

  it("reports nothing for another admin", async () => {
    getSessionUser.mockResolvedValue(OTHER_ADMIN);

    await expect(sessionPermissions()).resolves.toEqual([]);
  });

  it("reports nothing when signed out", async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(sessionPermissions()).resolves.toEqual([]);
  });
});

describe("requirePermission", () => {
  it("lets a listed operator through and hands back the profile", async () => {
    getSessionUser.mockResolvedValue(LISTED);

    await expect(requirePermission("revenue:read")).resolves.toEqual(LISTED);
    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("refuses another ADMIN with a 404, which is the whole point of it", async () => {
    // This is the defect: before the guard existed, this operator reached the
    // page by typing the URL because only the sidebar had ever checked.
    getSessionUser.mockResolvedValue(OTHER_ADMIN);

    await expect(requirePermission("revenue:read")).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("refuses a listed address whose role is no longer ADMIN", async () => {
    getSessionUser.mockResolvedValue({ ...LISTED, role: "USER" });

    await expect(requirePermission("revenue:read")).rejects.toThrow("NOT_FOUND");
  });

  it("sends a signed-out caller to /login, not to a 404", async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(requirePermission("revenue:read")).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("follows REVENUE_ADMIN_EMAILS, so the group changes without a deploy", async () => {
    process.env.REVENUE_ADMIN_EMAILS = OTHER_ADMIN.email;
    getSessionUser.mockResolvedValue(OTHER_ADMIN);

    await expect(requirePermission("revenue:read")).resolves.toEqual(OTHER_ADMIN);

    getSessionUser.mockResolvedValue(LISTED);
    await expect(requirePermission("revenue:read")).rejects.toThrow("NOT_FOUND");
  });

  it("lets an unreachable API fail loudly rather than granting anything", async () => {
    getSessionUser.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(requirePermission("revenue:read")).rejects.toThrow("ECONNREFUSED");
    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
