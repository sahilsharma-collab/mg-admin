// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { permissionsFor, revenueAdmins } from "./permissions";

const admin = (email: string) => ({ email, role: "ADMIN" });

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.REVENUE_ADMIN_EMAILS;
  delete process.env.REVENUE_ADMIN_EMAILS;
});

afterEach(() => {
  if (saved === undefined) delete process.env.REVENUE_ADMIN_EMAILS;
  else process.env.REVENUE_ADMIN_EMAILS = saved;
});

describe("revenueAdmins", () => {
  it("falls back to the four operators the sidebar used to name", () => {
    // The bridge that keeps today's deployment working before the variable is
    // configured. Delete it — and this expectation — once it is.
    expect(revenueAdmins()).toEqual([
      "anish@boomingbulls.com",
      "sandeepsingh@boomingbulls.com",
      "diwakarmandal001@gmail.com",
      "dexcetogaming@gmail.com",
    ]);
  });

  it("is configured by REVENUE_ADMIN_EMAILS, without a rebuild", () => {
    process.env.REVENUE_ADMIN_EMAILS = "finance@example.com,cfo@example.com";

    expect(revenueAdmins()).toEqual(["finance@example.com", "cfo@example.com"]);
  });

  it("does not reinstate the fallback when the variable is set but empty", () => {
    // An empty variable is a deployment saying "nobody", and it has to win.
    process.env.REVENUE_ADMIN_EMAILS = "";

    expect(revenueAdmins()).toEqual([]);
  });

  it("tolerates the whitespace and stray commas a hand-edited list carries", () => {
    process.env.REVENUE_ADMIN_EMAILS = " Finance@Example.com , , cfo@example.com ";

    expect(revenueAdmins()).toEqual(["finance@example.com", "cfo@example.com"]);
  });
});

describe("permissionsFor", () => {
  it("grants revenue:read to an operator on the list", () => {
    expect(permissionsFor(admin("anish@boomingbulls.com"))).toEqual([
      "revenue:read",
    ]);
  });

  it("grants nothing to an admin who is not", () => {
    expect(permissionsFor(admin("someone.else@boomingbulls.com"))).toEqual([]);
  });

  it("matches regardless of case, so a profile's capitalisation cannot revoke", () => {
    expect(permissionsFor(admin("Anish@BoomingBulls.com"))).toEqual([
      "revenue:read",
    ]);
  });

  it("grants nothing to a listed address whose role is no longer ADMIN", () => {
    // The cookie outlives a demotion; revenue is where that is worth noticing.
    expect(
      permissionsFor({ email: "anish@boomingbulls.com", role: "USER" }),
    ).toEqual([]);
  });

  it("grants nothing when there is no session at all", () => {
    expect(permissionsFor(null)).toEqual([]);
    expect(permissionsFor(undefined)).toEqual([]);
  });

  it("grants nothing for a profile with no usable email", () => {
    expect(permissionsFor({ role: "ADMIN" })).toEqual([]);
    expect(permissionsFor({ email: 42, role: "ADMIN" })).toEqual([]);
    expect(permissionsFor({ email: "   ", role: "ADMIN" })).toEqual([]);
  });

  it("follows the configured list rather than the fallback once one is set", () => {
    process.env.REVENUE_ADMIN_EMAILS = "finance@example.com";

    expect(permissionsFor(admin("anish@boomingbulls.com"))).toEqual([]);
    expect(permissionsFor(admin("finance@example.com"))).toEqual([
      "revenue:read",
    ]);
  });
});
