// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { permissionForPath } from "./permissions";

/**
 * Where the admin panel actually decides who may do what.
 *
 * These are characterisation tests: they pin the guard surface as it is today
 * so that moving a check — in either direction — is a deliberate, visible edit
 * rather than something that slips through. Where a test records a gap it says
 * so, and the fix for that gap is to change the test alongside the code.
 */

const ROOT = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(path.relative(ROOT, full));
    }
  }
  return out;
};

const serverRoutes = walk(path.join(ROOT, "app", "api"));

describe("the ADMIN gate", () => {
  it("lives in the login route, on the server", () => {
    expect(read("app/api/auth/login/route.ts")).toContain(
      'if (profileBody.user.role !== "ADMIN") {',
    );
  });

  it("is the only role decision on the whole server half", () => {
    // If a second one appears, it is either duplicated logic or a new surface
    // that needs its own tests — both are worth a failing build.
    // Any mention at all, not just `x.role`: a second gate written as
    // `const role = body.role` would slip past a property-access pattern.
    const withRoleLogic = serverRoutes.filter((file) => /\brole\b/.test(read(file)));

    expect(withRoleLogic).toEqual(["app/api/auth/login/route.ts"]);
  });

  it("is re-read for revenue only, in the one module that grants permissions", () => {
    // The login route decides whether a cookie is issued at all. lib/server
    // re-reads the live role because a cookie outlives a demotion, and revenue
    // is the one place in the panel worth noticing that. Any third reader is a
    // new surface that needs its own tests.
    const withRoleLogic = walk(path.join(ROOT, "lib", "server")).filter((file) =>
      /\brole\b/.test(read(file)),
    );

    expect(withRoleLogic.sort()).toEqual([
      "lib/server/permissions.ts",
      "lib/server/session.ts",
    ]);
  });

  it("runs before the cookie is issued, not after", () => {
    const source = read("app/api/auth/login/route.ts");
    const check = source.indexOf('role !== "ADMIN"');
    const issue = source.indexOf("response.cookies.set(AUTH_COOKIE, token");

    // Both must be found, or "-1 < n" would make the ordering assertion pass
    // for a file that no longer contains the check at all.
    expect(check).toBeGreaterThan(-1);
    expect(issue).toBeGreaterThan(-1);
    expect(check).toBeLessThan(issue);
  });

  it("is not duplicated in middleware, which gates on the cookie alone", () => {
    const source = read("middleware.ts");

    expect(source).not.toMatch(/\brole\b/);
    expect(source).toContain('request.cookies.get("auth_token")');
  });

  it("is not enforced by the proxy, which only checks that a session exists", () => {
    // Recorded so the division of labour is explicit: the proxy authenticates,
    // the API authorises. Every /api/mg call reaches the API as whoever the
    // cookie belongs to, and the API is what decides if that is allowed.
    const source = read("app/api/mg/[upstream]/[...path]/route.ts");

    expect(source).toContain('return json(401, "Not authenticated.");');
    expect(source).not.toMatch(/\brole\b/);
  });
});

describe("the revenue pages are gated on the server", () => {
  // The four addresses that used to be a render condition in the sidebar. They
  // are a fallback in lib/server/permissions.ts now, overridden by
  // REVENUE_ADMIN_EMAILS, and they must not reach the browser again.
  const ALLOWLIST = [
    "anish@boomingbulls.com",
    "sandeepsingh@boomingbulls.com",
    "diwakarmandal001@gmail.com",
    "dexcetogaming@gmail.com",
  ];

  // Same split as lib/session-surface.test.ts: these two prefixes are the
  // server half and never ship to the browser.
  const SERVER_PREFIXES = ["app/api/", "lib/server/"];
  const allSources = ["app", "components", "context", "lib"].flatMap((dir) =>
    walk(path.join(ROOT, dir)),
  );
  const clientSources = allSources.filter(
    (file) => !SERVER_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );

  const pageRoute = (file: string) =>
    "/" +
    path
      .dirname(path.relative("app", file))
      .split(path.sep)
      .filter((segment) => segment !== "." && !/^\(.*\)$/.test(segment))
      .join("/");

  const guardedPages = allSources.filter(
    (file) =>
      path.basename(file) === "page.tsx" &&
      permissionForPath(pageRoute(file)) !== undefined,
  );

  it("holds the allowlist on the server, in one module", () => {
    const source = read("lib/server/permissions.ts");
    for (const email of ALLOWLIST) expect(source).toContain(email);
  });

  it("has it in no file that reaches the browser — the sidebar included", () => {
    // Inverted KNOWN GAP. This used to assert the opposite: that the addresses
    // lived in components/Sidebar/Sidebar.tsx and nowhere else, which named the
    // finance-privileged operators to anyone who viewed source.
    const leaked = clientSources.filter((file) =>
      ALLOWLIST.some((email) => read(file).includes(email)),
    );

    expect(leaked).toEqual([]);
  });

  it("lets a deployment set the group without a rebuild", () => {
    expect(read("lib/server/permissions.ts")).toContain(
      "process.env.REVENUE_ADMIN_EMAILS",
    );
  });

  it("decides the sidebar links on the permission, not on an address", () => {
    const sidebar = read("components/Sidebar/Sidebar.tsx");

    expect(sidebar).toContain('can(granted, "revenue:read")');
    expect(sidebar).not.toMatch(/user\.email\s*===/);
  });

  it("found the revenue pages to check at all", () => {
    // A route-derivation bug that matched nothing would make the guard test
    // below pass over an empty list.
    expect(guardedPages.sort()).toEqual([
      "app/payment-dashboard/page.tsx",
      "app/renewals/page.tsx",
    ]);
  });

  it.each(["app/renewals/page.tsx", "app/payment-dashboard/page.tsx"])(
    "makes %s refuse on its own",
    (page) => {
      // Inverted KNOWN GAP. This used to assert that these pages carried no
      // guard: the sidebar hid the links, and typing the URL reached the full
      // renewals table plus a CSV of every customer's name, email, phone,
      // country and payment amount.
      const source = read(page);

      expect(source).toContain('requirePermission("revenue:read")');
      expect(source).toMatch(/from\s+["']@\/lib\/server\/guard["']/);
    },
  );

  it("guards every page under a permissioned route, including ones added later", () => {
    // The prefix match in lib/permissions.ts covers nested routes, so a page
    // added at /renewals/export is permissioned the moment it exists. Nothing
    // enforces that at runtime — a page that forgets the call simply renders —
    // so the build fails here instead.
    const unguarded = guardedPages.filter(
      (file) => !read(file).includes("requirePermission("),
    );

    expect(unguarded).toEqual([]);
  });

  it("keeps the grant source out of client components entirely", () => {
    // What `server-only` would do if it were a dependency here: a "use client"
    // file that imports lib/server would bundle the allowlist.
    const importers = clientSources.filter(
      (file) =>
        /^["']use client["']/m.test(read(file)) &&
        /from\s+["']@\/lib\/server\//.test(read(file)),
    );

    expect(importers).toEqual([]);
  });

  it("leaves middleware gating on the cookie alone, deliberately", () => {
    // Not an oversight and not a gap. The session cookie is an opaque bearer
    // token, so middleware could only learn who the caller is by spending it on
    // /api/profile — a network round trip on every matched navigation, which
    // would make the API's availability the panel's availability. The check
    // lives in the page guards, which run once, on the server, per page.
    const source = read("middleware.ts");

    expect(source).not.toMatch(/renewals|payment-dashboard/);
    expect(source).toContain('request.cookies.get("auth_token")');
  });
});
