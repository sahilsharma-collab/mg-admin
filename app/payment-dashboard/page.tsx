import HomePage from "@/components/Payments/Home";
import { requirePermission } from "@/lib/server/guard";

/**
 * Aggregate revenue: totals, packages, countries, and a PDF export of the lot.
 * Guarded for the same reason /renewals is, and by the same permission — the
 * sidebar hiding the link was never a boundary.
 */
export default async function Home() {
  await requirePermission("revenue:read");

  return <HomePage />;
}
