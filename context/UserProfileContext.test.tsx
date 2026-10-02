import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserProfileProvider, useUserProfile } from "./UserProfileContext";

const { api, axiosPost, isAxiosError, push, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), put: vi.fn() },
  axiosPost: vi.fn(),
  isAxiosError: vi.fn(() => false),
  push: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/api", () => ({ api }));
vi.mock("axios", () => ({
  default: { post: axiosPost, isAxiosError },
  isAxiosError,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("react-toastify", () => ({ toast }));

const ADMIN = { id: 1, name: "Rita", email: "rita@example.com", role: "ADMIN" };

const Probe = () => {
  const { user, error, login, logout } = useUserProfile();
  return (
    <div>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <span data-testid="error">{error ?? "none"}</span>
      <button onClick={() => login("rita@example.com", "pw")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
};

const renderProvider = () =>
  render(
    <UserProfileProvider>
      <Probe />
    </UserProfileProvider>,
  );

const click = (name: string) =>
  userEvent.setup().click(screen.getByRole("button", { name }));

beforeEach(() => {
  api.get.mockResolvedValue({ data: { success: false } });
  axiosPost.mockResolvedValue({ data: { success: true, user: ADMIN } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  isAxiosError.mockReturnValue(false);
});

describe("session bootstrap", () => {
  it("asks the proxy who the operator is, with no token to supply", async () => {
    renderProvider();

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/profile"));
    expect(api.get).toHaveBeenCalledOnce();
  });

  it("treats a 401 as signed out rather than as an error", async () => {
    isAxiosError.mockReturnValue(true);
    api.get.mockRejectedValue({ response: { status: 401 } });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
    expect(toast.error).not.toHaveBeenCalled();
    // The signed-out case must not surface as a load failure in the UI.
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("exposes the profile when the session is live", async () => {
    api.get.mockResolvedValue({ data: { success: true, user: ADMIN } });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("rita@example.com"),
    );
  });
});

describe("login", () => {
  it("posts the credentials to the server route, not to a backend origin", async () => {
    renderProvider();
    await click("login");

    await waitFor(() => expect(axiosPost).toHaveBeenCalledOnce());
    expect(axiosPost).toHaveBeenCalledWith("/api/auth/login", {
      email: "rita@example.com",
      password: "pw",
    });
  });

  it("stores nothing a script could read back", async () => {
    axiosPost.mockResolvedValue({
      data: { success: true, user: ADMIN, token: "leaked-token" },
    });

    renderProvider();
    await click("login");

    await waitFor(() => expect(axiosPost).toHaveBeenCalledOnce());
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });

  it("adopts the profile the server returned", async () => {
    renderProvider();
    await click("login");

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("rita@example.com"),
    );
  });

  it("leaves the session empty when the server declines", async () => {
    axiosPost.mockResolvedValue({ data: { success: false, message: "Access denied" } });

    renderProvider();
    await click("login");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Access denied"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("leaves the session empty when the request throws", async () => {
    axiosPost.mockRejectedValue(new Error("offline"));

    renderProvider();
    await click("login");

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});

describe("logout", () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { success: true, user: ADMIN } });
  });

  it("revokes the session server-side", async () => {
    axiosPost.mockResolvedValue({ data: { success: true, revoked: true } });

    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("rita@example.com"),
    );
    await click("logout");

    await waitFor(() => expect(axiosPost).toHaveBeenCalledWith("/api/auth/logout"));
  });

  it("forgets the operator and sends them to the login page", async () => {
    axiosPost.mockResolvedValue({ data: { success: true, revoked: true } });

    renderProvider();
    await click("logout");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("says so when the server session may still be alive", async () => {
    axiosPost.mockResolvedValue({ data: { success: true, revoked: false } });

    renderProvider();
    await click("logout");

    await waitFor(() => expect(toast.warn).toHaveBeenCalled());
  });

  it("signs out locally even when the revocation call throws", async () => {
    axiosPost.mockRejectedValue(new Error("offline"));

    renderProvider();
    await click("logout");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(toast.warn).toHaveBeenCalled();
  });
});

describe("useUserProfile", () => {
  it("refuses to be used outside the provider rather than returning undefined", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      "useUserProfile must be used within a UserProfileProvider",
    );
  });
});
