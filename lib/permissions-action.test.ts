// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const sessionPermissions = vi.fn();
vi.mock("@/lib/server/guard", () => ({
  sessionPermissions: () => sessionPermissions(),
}));

import { grantedPermissions } from "./permissions-action";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("grantedPermissions", () => {
  it("answers with what the caller's own session holds", async () => {
    sessionPermissions.mockResolvedValue(["revenue:read"]);

    await expect(grantedPermissions()).resolves.toEqual(["revenue:read"]);
  });

  it("answers with nothing when the session holds nothing", async () => {
    sessionPermissions.mockResolvedValue([]);

    await expect(grantedPermissions()).resolves.toEqual([]);
  });

  it("fails closed and stays up when the API cannot be reached", async () => {
    // The sidebar is chrome. An unreachable API hides the links rather than
    // taking the panel down — and never grants anything on the way.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    sessionPermissions.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(grantedPermissions()).resolves.toEqual([]);
    expect(logged).toHaveBeenCalled();
  });
});
