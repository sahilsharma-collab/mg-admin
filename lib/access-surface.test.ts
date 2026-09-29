// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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

describe("the payments pages are gated only in the sidebar", () => {
  const ALLOWLIST = [
    "anish@boomingbulls.com",
    "sandeepsingh@boomingbulls.com",
    "diwakarmandal001@gmail.com",
    "dexcetogaming@gmail.com",
  ];

  it("keeps the allowlist in one client component", () => {
    const sidebar = read("components/Sidebar/Sidebar.tsx");
    for (const email of ALLOWLIST) expect(sidebar).toContain(email);
  });

  it("has that allowlist nowhere else — not in any server route", () => {
    const elsewhere = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "lib"))]
      .filter((file) => ALLOWLIST.some((email) => read(file).includes(email)));

    expect(elsewhere).toEqual([]);
  });

  it.each(["app/renewals/page.tsx", "app/payment-dashboard/page.tsx"])(
    "records that %s carries no guard of its own",
    (page) => {
      // KNOWN GAP. The sidebar hides these links from operators outside the
      // allowlist; the pages themselves are reachable by typing the URL, and
      // they render customer names, emails, phone numbers and payment amounts.
      // Moving the allowlist server-side is a product decision — when it is
      // made, this expectation is the one to invert.
      const source = read(page);

      expect(source).not.toMatch(/useUserProfile|redirect|notFound|allowlist/);
      expect(source).not.toMatch(/\bemail\b/);
    },
  );

  it("records that middleware does not single those pages out either", () => {
    expect(read("middleware.ts")).not.toMatch(/renewals|payment-dashboard/);
  });
});
