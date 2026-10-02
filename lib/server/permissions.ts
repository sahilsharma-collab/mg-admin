import type { Permission } from "@/lib/permissions";

/**
 * Who holds which permission. Server half only.
 *
 * This module is the grant source, and it lives under lib/server for the same
 * reason upstream.ts does: nothing here may be imported by a file that ships to
 * the browser. lib/access-surface.test.ts enforces that — a `"use client"` file
 * importing `@/lib/server/` fails the build.
 *
 * The four addresses below used to sit inline in components/Sidebar/Sidebar.tsx
 * as a render condition, which put the names of the finance-privileged
 * operators into the client bundle for anyone who viewed source, and left the
 * pages themselves reachable by typing the URL.
 *
 * REVENUE_ADMIN_EMAILS is the intended home: a comma-separated list, resolved
 * at call time so a deployment can change who is in the finance group without a
 * rebuild. The literal list is a migration bridge that keeps today's four
 * operators working on the first deploy that has not set the variable yet; it
 * should be deleted once the variable is configured in every environment.
 *
 * FOLLOW-UP, outside this repo: the durable answer is a distinct role or
 * permission claim issued by the API (a FINANCE_ADMIN alongside ADMIN, say) and
 * carried on the session, so the panel reads an authorisation decision instead
 * of re-deriving one from an identity. That needs API changes; an email list
 * resolved on the server is the strongest thing the admin repo can do alone.
 */

const DEFAULT_REVENUE_ADMINS: readonly string[] = [
  "anish@boomingbulls.com",
  "sandeepsingh@boomingbulls.com",
  "diwakarmandal001@gmail.com",
  "dexcetogaming@gmail.com",
];

// Addresses are compared case-insensitively. An operator whose profile says
// "Anish@BoomingBulls.com" is the same person, and a case mismatch silently
// revoking a finance operator's access is a worse failure than the comparison
// being slightly loose.
const normalise = (email: string): string => email.trim().toLowerCase();

/**
 * The finance group.
 *
 * An unset variable falls back to the bridge list. A variable that is *set* is
 * authoritative even when it is empty — that is how a deployment says "nobody",
 * and it must not quietly reinstate four hard-coded addresses.
 */
export const revenueAdmins = (): readonly string[] => {
  const configured = process.env.REVENUE_ADMIN_EMAILS;
  if (configured === undefined) return DEFAULT_REVENUE_ADMINS;

  return configured.split(",").map(normalise).filter(Boolean);
};

/** The shape this module needs from a profile; the rest of it is irrelevant. */
export interface PermissionSubject {
  readonly email?: unknown;
  readonly role?: unknown;
}

/**
 * Everything the given session may do.
 *
 * The ADMIN check is not a second copy of the login gate — the login route
 * decides whether a cookie is issued at all, this decides what a live profile
 * may reach right now. An operator demoted since they signed in still holds a
 * valid cookie, and revenue is the one place in the panel worth re-reading the
 * role for.
 */
export const permissionsFor = (
  user: PermissionSubject | null | undefined,
): Permission[] => {
  if (!user || user.role !== "ADMIN") return [];

  const email = typeof user.email === "string" ? normalise(user.email) : "";
  if (!email) return [];

  return revenueAdmins().includes(email) ? ["revenue:read"] : [];
};
