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
//
// The stub keeps the one part of the real widget's contract the form depends
// on: picking a file calls onChange(file, preview) where preview is a blob:
// object URL, not a server URL (components/ui/image-upload.tsx:27-28). That is
// what lets the upload-failure tests below distinguish "kept the old image"
// from "persisted a URL that only resolves in this tab".
vi.mock("@/components/ui/image-upload", () => ({
  default: ({ onChange }: { onChange: (file: File, preview: string) => void }) => (
    <div data-testid="image-upload">
      <button
        type="button"
        onClick={() =>
          onChange(
            new File(["binary"], "chart.png", { type: "image/png" }),
            "blob:http://localhost/preview",
          )
        }
      >
        pick image
      </button>
    </div>
  ),
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

// ── The image upload is the only step that can fail between the operator's
// click and the write, and it used to fail by destroying data: handleImageUpload
// returns null (market-analysis-form.tsx:113-117), the payload sent
// `imgUrl: imgUrl || null`, and the record's existing image was gone while the
// toast said "Market Analysis updated."
const pickImage = () =>
  userEvent.setup().click(screen.getByRole("button", { name: "pick image" }));

const uploadFails = () =>
  api.post.mockImplementation((url: string) =>
    url === "/api/upload"
      ? Promise.reject(new Error("413 Payload Too Large"))
      : Promise.resolve({ data: {} }),
  );

const uploadReturns = (fileUrl: string) =>
  api.post.mockImplementation((url: string) =>
    url === "/api/upload"
      ? Promise.resolve({ data: { fileUrl } })
      : Promise.resolve({ data: {} }),
  );

const loadedForEdit = async () => {
  render(<MarketAnalysisForm maId="12" />);
  await waitFor(() =>
    expect(screen.getByPlaceholderText(/title/i)).toHaveValue("Nifty outlook"),
  );
};

describe("MarketAnalysisForm — a failed image upload", () => {
  it("writes nothing at all rather than wiping the record's image", async () => {
    uploadFails();
    await loadedForEdit();
    await pickImage();
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to upload image."));
    expect(api.put).not.toHaveBeenCalled();
  });

  it("never sends a null imgUrl over an image the operator did not remove", async () => {
    uploadFails();
    await loadedForEdit();
    await pickImage();
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    for (const call of api.put.mock.calls) {
      expect(call[1].imgUrl).not.toBeNull();
    }
  });

  it("does not persist the blob: preview URL as if it were the image", async () => {
    uploadFails();
    await loadedForEdit();
    await pickImage();
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const sent = JSON.stringify([...api.put.mock.calls, ...api.post.mock.calls.slice(1)]);
    expect(sent).not.toContain("blob:");
  });

  it("does not claim the record was updated", async () => {
    uploadFails();
    await loadedForEdit();
    await pickImage();
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves the form on screen and submittable, so the edits survive", async () => {
    uploadFails();
    await loadedForEdit();
    await pickImage();
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /update/i })).toBeEnabled();
  });

  it("creates nothing when the upload fails on a new record", async () => {
    uploadFails();
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await pickImage();
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to upload image."));
    expect(api.post).toHaveBeenCalledWith("/api/upload", expect.anything(), expect.anything());
    expect(api.post).not.toHaveBeenCalledWith("/api/market", expect.anything(), expect.anything());
  });
});

// The other direction: a guard that refuses a *successful* upload, or refuses
// the write outright, would pass every assertion above and still be a defect.
describe("MarketAnalysisForm — a successful image upload", () => {
  it("saves the newly uploaded URL on an existing record", async () => {
    uploadReturns("https://cdn.example.com/new.png");
    await loadedForEdit();
    await pickImage();
    await submit();

    await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
    expect(api.put.mock.calls[0][1]).toEqual({
      title: "Nifty outlook",
      description: "Range bound",
      imgUrl: "https://cdn.example.com/new.png",
    });
    expect(toast.success).toHaveBeenCalledWith("Market Analysis updated.");
  });

  it("saves the newly uploaded URL on a new record", async () => {
    uploadReturns("https://cdn.example.com/new.png");
    render(<MarketAnalysisForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await pickImage();
    await submit();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/market", expect.anything(), expect.anything()),
    );
    const payload = api.post.mock.calls.find((c: unknown[]) => c[0] === "/api/market")![1];
    expect(payload.imgUrl).toBe("https://cdn.example.com/new.png");
  });
});
