import { notFound, redirect } from "next/navigation";

import { can, type Permission } from "@/lib/permissions";
import { permissionsFor } from "@/lib/server/permissions";
import { getSessionUser, type SessionUser } from "@/lib/server/session";

/**
 * The access boundary for permissioned pages.
 *
 * A page calls `requirePermission` and awaits it before returning any markup,
 * so a refusal happens before the page exists rather than after it has rendered
 * and been shipped. This is the part the sidebar could never be: hiding a link
 * is a UX decision made in the browser, and typing the URL walked straight past
 * it.
 */

/** Everything the calling session may do. Empty when signed out. */
export const sessionPermissions = async (): Promise<Permission[]> =>
  permissionsFor(await getSessionUser());

/**
 * Refuses the request unless the caller holds `permission`.
 *
 * No session sends the operator to /login, which is where middleware would have
 * sent them had the cookie been absent rather than dead. Holding a session but
 * not the permission renders 404: this is an intra-admin control, and a 404
 * declines to confirm to a colleague outside the finance group that the page is
 * there. Both outcomes throw, so nothing after the call can run.
 */
export const requirePermission = async (
  permission: Permission,
): Promise<SessionUser> => {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!can(permissionsFor(user), permission)) notFound();

  return user;
};
