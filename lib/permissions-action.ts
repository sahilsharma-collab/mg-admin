"use server";

import type { Permission } from "@/lib/permissions";
import { sessionPermissions } from "@/lib/server/guard";

/**
 * The one seam through which client code learns what it may do.
 *
 * The sidebar has to know whether to draw the revenue links, and the answer
 * depends on a list that must not ship to the browser. A server action is the
 * narrow way to ask: the client gets a boolean-shaped answer about *itself*,
 * derived from its own cookie, and the list stays on the server.
 *
 * This is convenience, not enforcement. Anyone can call it, and all it will
 * ever say is what the caller's own session holds; the pages refuse on their
 * own in lib/server/guard.ts regardless of what the sidebar chose to draw.
 */
export async function grantedPermissions(): Promise<Permission[]> {
  try {
    return await sessionPermissions();
  } catch (error) {
    // Chrome must not take the panel down. An unreachable API means the links
    // stay hidden, which is the fail-closed direction; the page guard raises
    // the same failure properly if the operator navigates there anyway.
    console.error("Could not resolve session permissions:", error);
    return [];
  }
}
