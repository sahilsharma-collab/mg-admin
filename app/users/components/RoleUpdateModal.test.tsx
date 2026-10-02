import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RoleUpdateModal } from "./RoleUpdateModal";

const apiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("react-toastify", () => ({ toast: { get success() { return toast.success; }, get error() { return toast.error; } } }));

const user = { id: "42", name: "Rita", email: "rita@example.com", role: "USER" };

const onSuccess = vi.fn();
const onClose = vi.fn();

const renderModal = (overrides: Partial<typeof user> = {}) =>
  render(
    <RoleUpdateModal
      isOpen
      onClose={onClose}
      user={{ ...user, ...overrides }}
      onSuccess={onSuccess}
    />,
  );

/** Opens the Radix select and picks an option by its visible label. */
const chooseRole = async (role: string) => {
  const person = userEvent.setup();
  await person.click(screen.getByRole("combobox"));
  await person.click(await screen.findByRole("option", { name: role }));
};

const clickUpdate = () =>
  userEvent.setup().click(screen.getByRole("button", { name: "Update Role" }));

beforeEach(() => {
  apiFetch.mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("RoleUpdateModal", () => {
  it("renders nothing while closed, so the write cannot be triggered", () => {
    render(
      <RoleUpdateModal isOpen={false} onClose={onClose} user={user} onSuccess={onSuccess} />,
    );

    expect(screen.queryByRole("button", { name: "Update Role" })).not.toBeInTheDocument();
  });

  it("starts on the user's current role", () => {
    renderModal();

    expect(screen.getByRole("combobox")).toHaveTextContent("USER");
  });

  it("refuses to submit a role that has not changed", () => {
    renderModal();

    expect(screen.getByRole("button", { name: "Update Role" })).toBeDisabled();
  });

  it("posts the chosen role and the target user's id", async () => {
    renderModal();
    await chooseRole("MODERATOR");
    await clickUpdate();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe("/api/admin/assign-role");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ role: "MODERATOR", userId: "42" });
  });

  it("sends only role and userId — nothing else about the target user", async () => {
    renderModal();
    await chooseRole("ADMIN");
    await clickUpdate();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    expect(Object.keys(JSON.parse(apiFetch.mock.calls[0][1].body)).sort()).toEqual([
      "role",
      "userId",
    ]);
  });

  it("does not attach an Authorization header — the proxy owns the token", async () => {
    renderModal();
    await chooseRole("ADMIN");
    await clickUpdate();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    const headers = apiFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain(
      "authorization",
    );
  });

  it("offers exactly the three roles the API knows", async () => {
    renderModal();
    await userEvent.setup().click(screen.getByRole("combobox"));

    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual([
      "USER",
      "MODERATOR",
      "ADMIN",
    ]);
  });

  it("closes and refreshes the table once the API accepts", async () => {
    renderModal();
    await chooseRole("MODERATOR");
    await clickUpdate();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not claim success, or close, when the API refuses", async () => {
    apiFetch.mockResolvedValue({ ok: false });
    renderModal();
    await chooseRole("ADMIN");
    await clickUpdate();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports a network failure rather than pretending the role changed", async () => {
    apiFetch.mockRejectedValue(new Error("offline"));
    renderModal();
    await chooseRole("ADMIN");
    await clickUpdate();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
