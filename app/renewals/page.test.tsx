// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const requirePermission = vi.fn();
vi.mock("@/lib/server/guard", () => ({
  requirePermission: (permission: string) => requirePermission(permission),
}));

// Stubbed so this test is about the guard, not about the table: the real client
// component fetches on mount and is owned elsewhere.
const RenewalsDataClient = vi.fn(() => null);
vi.mock("./components/client", () => ({ default: () => RenewalsDataClient() }));

import RenewalsPage from "./page";

afterEach(() => {
  vi.clearAllMocks();
});

describe("/renewals", () => {
  it("asks for revenue:read before it renders anything", async () => {
    requirePermission.mockResolvedValue({ email: "a@b.com", role: "ADMIN" });

    await RenewalsPage();

    expect(requirePermission).toHaveBeenCalledWith("revenue:read");
  });

  it("renders the renewals table for an operator who holds it", async () => {
    requirePermission.mockResolvedValue({ email: "a@b.com", role: "ADMIN" });

    const element = await RenewalsPage();

    expect(element).toBeTruthy();
  });

  it("produces no page at all when the guard refuses", async () => {
    // notFound() and redirect() both throw. Awaiting the guard first is what
    // makes a refusal happen *instead of* the page: an admin outside the
    // finance group who types /renewals gets nothing back, where before they
    // got every customer's name, email, phone and payment amount.
    requirePermission.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));

    await expect(RenewalsPage()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(RenewalsDataClient).not.toHaveBeenCalled();
  });
});
