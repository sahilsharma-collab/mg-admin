// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const requirePermission = vi.fn();
vi.mock("@/lib/server/guard", () => ({
  requirePermission: (permission: string) => requirePermission(permission),
}));

// Stubbed for the same reason /renewals stubs its table: the real component
// pulls in jsPDF and html2canvas and fetches on mount.
const PaymentsHome = vi.fn(() => null);
vi.mock("@/components/Payments/Home", () => ({ default: () => PaymentsHome() }));

import PaymentDashboardPage from "./page";

afterEach(() => {
  vi.clearAllMocks();
});

describe("/payment-dashboard", () => {
  it("asks for revenue:read before it renders anything", async () => {
    requirePermission.mockResolvedValue({ email: "a@b.com", role: "ADMIN" });

    await PaymentDashboardPage();

    expect(requirePermission).toHaveBeenCalledWith("revenue:read");
  });

  it("renders the dashboard for an operator who holds it", async () => {
    requirePermission.mockResolvedValue({ email: "a@b.com", role: "ADMIN" });

    expect(await PaymentDashboardPage()).toBeTruthy();
  });

  it("produces no page at all when the guard refuses", async () => {
    requirePermission.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));

    await expect(PaymentDashboardPage()).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(PaymentsHome).not.toHaveBeenCalled();
  });
});
