/**
 * The permission vocabulary the admin panel decides access with.
 *
 * Nothing in this module is a grant and nothing in it is a secret: it names the
 * permissions and says which routes need which. Who actually *holds* a
 * permission is resolved on the server, in lib/server/permissions.ts, and never
 * reaches the browser.
 *
 * Keeping the vocabulary in one isomorphic module is the point of it. The
 * sidebar hides links and the page guards refuse requests, and both now ask the
 * same question of the same name. Before, the sidebar compared `user.email`
 * against four addresses inline and was the only thing in the panel that knew
 * the rule — which made "hidden" read as "protected" when it was neither.
 *
 * This is a segregation-of-duties control between admins, not a public
 * boundary: a session only exists at all for an operator the API reports as
 * ADMIN (app/api/auth/login/route.ts:90), and the API enforces that
 * independently. What this adds is the second question — which admins.
 */

export const PERMISSIONS = ["revenue:read"] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface PermissionedRoute {
  /** Matches this exact route and everything nested under it. */
  readonly prefix: string;
  readonly permission: Permission;
}

/**
 * Page routes that require a permission.
 *
 * Declared as prefixes so a page added later at, say, /renewals/export is
 * covered by the same rule the moment it exists. Matching the list is not by
 * itself enforcement — the enforcement is `requirePermission` in the page — so
 * lib/access-surface.test.ts fails the build if a page appears under one of
 * these prefixes without calling the guard.
 */
export const PERMISSIONED_ROUTES: readonly PermissionedRoute[] = [
  { prefix: "/renewals", permission: "revenue:read" },
  { prefix: "/payment-dashboard", permission: "revenue:read" },
];

/** The permission a page path requires, or undefined if it requires none. */
export const permissionForPath = (pathname: string): Permission | undefined => {
  // A Next pathname carries no query string, but a caller that passes a full
  // URL path must not fall through the match and read as public. A trailing
  // slash needs no stripping — "/renewals/" is caught by the prefix branch.
  const path = pathname.split(/[?#]/)[0];

  return PERMISSIONED_ROUTES.find(
    (route) => path === route.prefix || path.startsWith(`${route.prefix}/`),
  )?.permission;
};

/**
 * Fail-closed membership test.
 *
 * `granted` is null in the sidebar for as long as the server has not answered
 * what this session may do, and an unknown answer has to read as "no" — the
 * alternative is the revenue links flashing into view for every operator on
 * every page load.
 */
export const can = (
  granted: readonly Permission[] | null | undefined,
  permission: Permission,
): boolean => Array.isArray(granted) && granted.includes(permission);
