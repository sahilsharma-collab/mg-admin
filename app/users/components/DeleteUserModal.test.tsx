import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeleteUserModal } from "./DeleteUserModal";

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("react-toastify", () => ({
  toast: {
    get success() {
      return toast.success;
    },
    get error() {
      return toast.error;
    },
  },
}));

const user = { id: "42", name: "Rita", email: "rita@example.com" };
const onSuccess = vi.fn();
const onClose = vi.fn();

const renderModal = (isOpen = true) =>
  render(
    <DeleteUserModal
      isOpen={isOpen}
      onClose={onClose}
      user={user}
      onSuccess={onSuccess}
    />,
  );

const confirm = () =>
  userEvent.setup().click(screen.getByRole("button", { name: /delete user/i }));

beforeEach(() => {
  apiFetch.mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("DeleteUserModal", () => {
  it("asks before it destroys anything", () => {
    renderModal();

    expect(screen.getByText(/are you sure you want to delete this user/i))
      .toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("sends nothing while closed", () => {
    renderModal(false);

    expect(screen.queryByRole("button", { name: /delete user/i })).not.toBeInTheDocument();
  });

  it("names the user being deleted, so the wrong row is visible before the click", () => {
    renderModal();

    expect(screen.getByText("User: Rita")).toBeInTheDocument();
    expect(screen.getByText("rita@example.com")).toBeInTheDocument();
  });

  it("deletes the identified user and nobody else", async () => {
    renderModal();
    await confirm();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/delete-user/42", {
      method: "DELETE",
    });
  });

  it("refreshes the table only once the API accepts", async () => {
    renderModal();
    await confirm();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(toast.success).toHaveBeenCalled();
  });

  it("does not report a deletion the API refused", async () => {
    apiFetch.mockResolvedValue({ ok: false });
    renderModal();
    await confirm();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
