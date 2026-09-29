import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const grantedPermissions = vi.fn();
vi.mock("@/lib/permissions-action", () => ({
  grantedPermissions: () => grantedPermissions(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

vi.mock("@/context/theme-context", () => ({ useTheme: () => ({ theme: "light" }) }));

const user = { email: "anish@boomingbulls.com", role: "ADMIN" };
vi.mock("@/context/UserProfileContext", () => ({
  useUserProfile: () => ({ user }),
}));

import Sidebar from "./Sidebar";

const openVipMenu = async () => {
  await userEvent.setup().click(screen.getByText("VIP"));
};

beforeEach(() => {
  // next/link calls it on click and jsdom has no implementation; without this
  // every assertion here is buried in "Not implemented" noise.
  window.scrollTo = () => {};
  grantedPermissions.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Sidebar revenue links", () => {
  it("asks the server what this session may do", async () => {
    render(<Sidebar />);

    await waitFor(() => expect(grantedPermissions).toHaveBeenCalled());
  });

  it("shows only All Payments to an operator without revenue:read", async () => {
    grantedPermissions.mockResolvedValue([]);
    render(<Sidebar />);
    await waitFor(() => expect(grantedPermissions).toHaveBeenCalled());

    await openVipMenu();

    expect(screen.getByText("All Payments")).toBeInTheDocument();
    expect(screen.queryByText("All Renewals")).not.toBeInTheDocument();
    expect(screen.queryByText("Payment Dashboard")).not.toBeInTheDocument();
  });

  it("shows the revenue links once the server grants revenue:read", async () => {
    grantedPermissions.mockResolvedValue(["revenue:read"]);
    render(<Sidebar />);
    await waitFor(() => expect(grantedPermissions).toHaveBeenCalled());

    await openVipMenu();

    await waitFor(() =>
      expect(screen.getByText("All Renewals")).toBeInTheDocument(),
    );
    expect(screen.getByText("Payment Dashboard")).toBeInTheDocument();
  });

  it("hides them while the answer is still in flight", async () => {
    // Never resolves. A sidebar that guessed "yes" would flash the links for
    // every operator on every page load.
    grantedPermissions.mockReturnValue(new Promise(() => {}));
    render(<Sidebar />);

    await openVipMenu();

    expect(screen.queryByText("All Renewals")).not.toBeInTheDocument();
  });

  it("hides them when the server cannot be asked", async () => {
    grantedPermissions.mockRejectedValue(new Error("offline"));
    render(<Sidebar />);
    await waitFor(() => expect(grantedPermissions).toHaveBeenCalled());

    await openVipMenu();

    expect(screen.queryByText("All Renewals")).not.toBeInTheDocument();
  });

  it("decides on the permission, not on the signed-in address", async () => {
    // The old rule compared user.email against four literals in this file. The
    // profile here is one of those four; what governs now is the server's
    // answer, which is empty.
    expect(user.email).toBe("anish@boomingbulls.com");
    grantedPermissions.mockResolvedValue([]);
    render(<Sidebar />);
    await waitFor(() => expect(grantedPermissions).toHaveBeenCalled());

    await openVipMenu();

    expect(screen.queryByText("All Renewals")).not.toBeInTheDocument();
  });
});
