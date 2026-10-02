import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EditProfileModal from "./EditProfileModal";

const { api, updateProfile, currentUser } = vi.hoisted(() => ({
  api: { post: vi.fn() },
  updateProfile: vi.fn(),
  currentUser: {
    value: {
      id: 9,
      name: "Rita Admin",
      email: "rita@example.com",
      countryCode: "+91",
      phone: "9876543210",
      city: "Pune",
      imgUrl: "https://cdn.example.com/rita.png",
      role: "ADMIN",
      isUserBlocked: false,
    } as Record<string, unknown>,
  },
}));

vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/context/UserProfileContext", () => ({
  useUserProfile: () => ({
    user: currentUser.value,
    updateProfile,
    loading: false,
  }),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const onClose = vi.fn();
const renderModal = () => render(<EditProfileModal isOpen onClose={onClose} />);
const save = () =>
  userEvent.setup().click(screen.getByRole("button", { name: "Save Changes" }));

const retype = async (placeholder: string, value: string) => {
  const person = userEvent.setup();
  const field = screen.getByPlaceholderText(placeholder);
  await person.clear(field);
  if (value) await person.type(field, value);
};

beforeEach(() => {
  updateProfile.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("EditProfileModal", () => {
  it("prefills from the signed-in profile", () => {
    renderModal();

    expect(screen.getByPlaceholderText("Enter your name")).toHaveValue("Rita Admin");
    expect(screen.getByPlaceholderText("Enter phone number")).toHaveValue("9876543210");
    expect(screen.getByPlaceholderText("Enter your city")).toHaveValue("Pune");
  });

  it("saves the editable fields", async () => {
    renderModal();
    await retype("Enter your name", "Rita B");
    await save();

    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    expect(updateProfile).toHaveBeenCalledWith({
      name: "Rita B",
      countryCode: "+91",
      phone: "9876543210",
      city: "Pune",
      imgUrl: "https://cdn.example.com/rita.png",
    });
  });

  it("never sends a field the operator cannot legitimately change", async () => {
    renderModal();
    await save();

    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    const sent = Object.keys(updateProfile.mock.calls[0][0]);
    for (const forbidden of ["role", "email", "id", "isUserBlocked", "emailVerified"]) {
      expect(sent).not.toContain(forbidden);
    }
  });

  it("keeps the existing avatar when no new file is chosen", async () => {
    renderModal();
    await save();

    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    expect(updateProfile.mock.calls[0][0].imgUrl).toBe(
      "https://cdn.example.com/rita.png",
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each([
    [
      "letters in the phone number",
      "Enter phone number",
      "98765abcde",
      "Phone number must contain only digits",
    ],
    [
      "a phone number that is too short",
      "Enter phone number",
      "12345",
      "Phone number must be at least 7 digits",
    ],
    ["a one-character name", "Enter your name", "R", "Name must be at least 2 characters"],
    ["a one-character city", "Enter your city", "P", "City must be at least 2 characters"],
  ])("refuses to save with %s", async (_label, placeholder, value, message) => {
    renderModal();
    await retype(placeholder, value);
    await save();

    await waitFor(() => expect(screen.getByText(message)).toBeVisible());
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("stays open when the save fails, so the edits are not lost", async () => {
    updateProfile.mockRejectedValue(new Error("boom"));
    renderModal();
    await save();

    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes once the save lands", async () => {
    renderModal();
    await save();

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
