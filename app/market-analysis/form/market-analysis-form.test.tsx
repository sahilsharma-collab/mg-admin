import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MarketAnalysisForm from "./market-analysis-form";

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api }));

// The uploader is a drag/drop/paste widget over next/image; the payload the
// form builds is what this suite is about, so it is stubbed to a marker.
vi.mock("@/components/ui/image-upload", () => ({
  default: () => <div data-testid="image-upload" />,
}));

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-toastify", () => ({ toast }));

const submit = () =>
  userEvent.setup().click(screen.getByRole("button", { name: /create|update/i }));

beforeEach(() => {
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
  api.get.mockResolvedValue({
    data: {
      marketAnalysis: {
        title: "Nifty outlook",
        description: "Range bound",
        imgUrl: "https://cdn.example.com/a.png",
      },
    },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("MarketAnalysisForm — create", () => {
  it("does not write without a title", async () => {
    render(<MarketAnalysisForm />);
    await submit();

    await waitFor(() => expect(screen.getByText("Title is required")).toBeVisible());
    expect(api.post).not.toHaveBeenCalled();
  });

  it("POSTs the collection with the contract's three fields", async () => {
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "Nifty outlook");
    await submit();

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    expect(api.post.mock.calls[0][0]).toBe("/api/market");
    expect(api.post.mock.calls[0][1]).toEqual({
      title: "Nifty outlook",
      description: null,
      imgUrl: null,
    });
  });

  it("sends null rather than an empty string for the optional fields", async () => {
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await submit();

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    const payload = api.post.mock.calls[0][1];
    expect(payload.description).toBeNull();
    expect(payload.imgUrl).toBeNull();
  });

  it("does not upload anything when no file was chosen", async () => {
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await submit();

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    expect(api.post).not.toHaveBeenCalledWith("/api/upload", expect.anything(), expect.anything());
  });

  it("navigates back to the list only after the write lands", async () => {
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/market-analysis"));
    expect(toast.success).toHaveBeenCalledWith("Market Analysis created.");
  });

  it("surfaces the API's own rejection message", async () => {
    api.post.mockRejectedValue(
      new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 422,
        data: { message: "Title is too long." },
      } as never),
    );
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Title is too long."));
    expect(push).not.toHaveBeenCalled();
  });

  it("does not navigate away when the API refuses", async () => {
    api.post.mockRejectedValue(new Error("boom"));
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });
});

describe("MarketAnalysisForm — edit", () => {
  it("loads the record it is editing", async () => {
    render(<MarketAnalysisForm maId="12" />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/title/i)).toHaveValue("Nifty outlook"),
    );
    expect(api.get).toHaveBeenCalledWith("/api/market/12", expect.anything());
  });

  it("PUTs the record's own id and preserves its existing image", async () => {
    render(<MarketAnalysisForm maId="12" />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/title/i)).toHaveValue("Nifty outlook"),
    );

    await submit();

    await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
    expect(api.put.mock.calls[0][0]).toBe("/api/market/12");
    expect(api.put.mock.calls[0][1]).toEqual({
      title: "Nifty outlook",
      description: "Range bound",
      imgUrl: "https://cdn.example.com/a.png",
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});
