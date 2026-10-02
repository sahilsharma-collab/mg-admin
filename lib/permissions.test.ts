// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  PERMISSIONED_ROUTES,
  PERMISSIONS,
  can,
  permissionForPath,
} from "./permissions";

describe("the permission vocabulary", () => {
  it("names the revenue permission the routes and the guard agree on", () => {
    expect(PERMISSIONS).toContain("revenue:read");
  });

  it("requires it for both revenue pages", () => {
    expect(PERMISSIONED_ROUTES).toEqual(
      expect.arrayContaining([
        { prefix: "/renewals", permission: "revenue:read" },
        { prefix: "/payment-dashboard", permission: "revenue:read" },
      ]),
    );
  });

  it("leaves /payments open, which every admin has always had", () => {
    expect(permissionForPath("/payments")).toBeUndefined();
  });
});

describe("permissionForPath", () => {
  it.each(["/renewals", "/payment-dashboard"])("covers %s itself", (path) => {
    expect(permissionForPath(path)).toBe("revenue:read");
  });

  it.each(["/renewals/export", "/payment-dashboard/2024/q1"])(
    "covers %s, so a page added under the prefix is not left open",
    (path) => {
      expect(permissionForPath(path)).toBe("revenue:read");
    },
  );

  it("does not match a sibling route that merely starts with the same text", () => {
    // /renewals-archive is a different page, not a child of /renewals.
    expect(permissionForPath("/renewals-archive")).toBeUndefined();
  });

  it.each(["/", "/users", "/payments", "/live-trade"])(
    "leaves the unpermissioned page %s alone",
    (path) => {
      expect(permissionForPath(path)).toBeUndefined();
    },
  );

  it("ignores a trailing slash rather than falling through as public", () => {
    // Caught by the same prefix branch the nested routes are, not by a strip.
    expect(permissionForPath("/renewals/")).toBe("revenue:read");
  });

  it("ignores a query string, which a full URL path would carry", () => {
    expect(permissionForPath("/renewals?page=2")).toBe("revenue:read");
    expect(permissionForPath("/payment-dashboard#totals")).toBe("revenue:read");
  });
});

describe("can", () => {
  it("grants a permission the session holds", () => {
    expect(can(["revenue:read"], "revenue:read")).toBe(true);
  });

  it("refuses one it does not", () => {
    expect(can([], "revenue:read")).toBe(false);
  });

  it("refuses while the answer is still unknown", () => {
    // The sidebar starts at null. Reading that as a grant would flash the
    // revenue links for every operator on every page load.
    expect(can(null, "revenue:read")).toBe(false);
    expect(can(undefined, "revenue:read")).toBe(false);
  });
});
