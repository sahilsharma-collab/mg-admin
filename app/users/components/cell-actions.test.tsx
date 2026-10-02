import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CellAction } from "./cell-actions";
import type { UserColumn } from "./columns";

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-toastify", () => ({ toast }));

const data: UserColumn = {
  id: "42",
  name: "Rita",
  email: "rita@example.com",
  role: "USER",
  createdAt: "01/01/2025",
  updatedAt: "01/01/2025",
  phone: "9876543210",
  exnessId: "MT5-99887",
  exnessVerified: true,
};

const onSuccess = vi.fn();

const openMenu = async () => {
  render(<CellAction data={data} onSuccess={onSuccess} />);
  await userEvent.setup().click(screen.getByRole("button", { name: /open menu/i }));
  await screen.findByText("Remove Exness");
};

const choose = (label: string | RegExp) =>
  userEvent.setup().click(screen.getByText(label));

const clickButton = (name: RegExp) =>
  userEvent.setup().click(screen.getByRole("button", { name }));

beforeEach(() => {
  apiFetch.mockResolvedValue({ ok: true, statusText: "OK" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Remove Exness severs a user's broker binding and cannot be undone from this
// panel. It used to fire on the menu click, sitting between Change Role and
// Delete User — both of which open a dialog — so it was the one entry that
// punished the habit the rest of the menu teaches.
describe("CellAction — Remove Exness", () => {
  it("asks before it severs anything", async () => {
    await openMenu();
    await choose("Remove Exness");

    await waitFor(() => expect(screen.getByText("Are you sure?")).toBeVisible());
    expect(apiFetch).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("names the binding and the account it is being taken from", async () => {
    await openMenu();
    await choose("Remove Exness");

    const note = await screen.findByText(/Removes the Exness binding/);
    expect(note).toHaveTextContent("MT5-99887");
    expect(note).toHaveTextContent("rita@example.com");
  });

  it("sends nothing when the operator backs out", async () => {
    await openMenu();
    await choose("Remove Exness");
    await screen.findByText("Are you sure?");
    await clickButton(/^cancel$/i);

    await waitFor(() =>
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument(),
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  // The other direction: a dialog that never lets the removal through would
  // pass every assertion above and be just as broken.
  it("removes the binding for that user, and only on confirmation", async () => {
    await openMenu();
    await choose("Remove Exness");
    await screen.findByText("Are you sure?");
    await clickButton(/^confirm$/i);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    expect(apiFetch.mock.calls[0][0]).toBe("/api/exness/remove/42");
    expect(apiFetch.mock.calls[0][1].method).toBe("POST");
    expect(toast.success).toHaveBeenCalledWith("Exness ID removed successfully");
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("does not report a removal the API refused", async () => {
    apiFetch.mockResolvedValue({ ok: false, statusText: "Conflict" });
    await openMenu();
    await choose("Remove Exness");
    await screen.findByText("Are you sure?");
    await clickButton(/^confirm$/i);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error removing Exness ID"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("closes the dialog once the removal lands, so a second click cannot repeat it", async () => {
    await openMenu();
    await choose("Remove Exness");
    await screen.findByText("Are you sure?");
    await clickButton(/^confirm$/i);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument(),
    );
  });
});

// The neighbours this action was made to match. If either stops confirming,
// the consistency argument above stops holding and this file should say so.
describe("CellAction — the rest of the menu still confirms", () => {
  it("Delete User opens its own dialog rather than deleting", async () => {
    await openMenu();
    await choose("Delete User");

    await waitFor(() =>
      expect(
        screen.getByText(/are you sure you want to delete this user/i),
      ).toBeVisible(),
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
