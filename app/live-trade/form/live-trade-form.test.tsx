import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LiveTradeForm from "./live-trade-form";

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api }));

// Same stub as the market-analysis suite, and for the same reason: the one part
// of the real widget's contract that matters here is that picking a file hands
// the form a blob: object URL, never a server URL
// (components/ui/image-upload.tsx:27-28).
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
  render(<LiveTradeForm ltId="7" />);
  await waitFor(() =>
    expect(screen.getByPlaceholderText(/title/i)).toHaveValue("EURUSD long"),
  );
};

beforeEach(() => {
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
  api.get.mockResolvedValue({
    data: {
      LiveTrade: {
        title: "EURUSD long",
        description: "Entry 1.08",
        imgUrl: "https://cdn.example.com/eurusd.png",
      },
    },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("LiveTradeForm", () => {
  it("loads the record it is editing", async () => {
    await loadedForEdit();

    expect(api.get).toHaveBeenCalledWith("/api/trade/7", expect.anything());
  });

  it("PUTs the record's own id and preserves its existing image", async () => {
    await loadedForEdit();
    await submit();

    await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
    expect(api.put.mock.calls[0][0]).toBe("/api/trade/7");
    expect(api.put.mock.calls[0][1]).toEqual({
      title: "EURUSD long",
      description: "Entry 1.08",
      imgUrl: "https://cdn.example.com/eurusd.png",
    });
  });

  it("does not write without a title", async () => {
    render(<LiveTradeForm />);
    await submit();

    await waitFor(() => expect(screen.getByText("Title is required")).toBeVisible());
    expect(api.post).not.toHaveBeenCalled();
  });
});

// This form is a character-for-character copy of the market-analysis one apart
// from its nouns and routes, so it carried the same silent data loss: a failed
// upload returned null, the payload sent `imgUrl: imgUrl || null`, and the
// record's image was gone behind a "Live Trade updated." toast.
describe("LiveTradeForm — a failed image upload", () => {
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
    const sent = JSON.stringify([
      ...api.put.mock.calls,
      ...api.post.mock.calls.filter((c: unknown[]) => c[0] !== "/api/upload"),
    ]);
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
    render(<LiveTradeForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await pickImage();
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to upload image."));
    expect(api.post).toHaveBeenCalledWith("/api/upload", expect.anything(), expect.anything());
    expect(api.post).not.toHaveBeenCalledWith("/api/trade", expect.anything(), expect.anything());
  });
});

// The over-fix direction: a guard that refuses a *successful* upload, or that
// refuses the write outright, passes everything above and is still a defect.
describe("LiveTradeForm — a successful image upload", () => {
  it("saves the newly uploaded URL on an existing record", async () => {
    uploadReturns("https://cdn.example.com/new.png");
    await loadedForEdit();
    await pickImage();
    await submit();

    await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
    expect(api.put.mock.calls[0][1]).toEqual({
      title: "EURUSD long",
      description: "Entry 1.08",
      imgUrl: "https://cdn.example.com/new.png",
    });
    expect(toast.success).toHaveBeenCalledWith("Live Trade updated.");
  });

  it("saves the newly uploaded URL on a new record", async () => {
    uploadReturns("https://cdn.example.com/new.png");
    render(<LiveTradeForm />);
    await userEvent.setup().type(screen.getByPlaceholderText(/title/i), "T");
    await pickImage();
    await submit();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/trade", expect.anything(), expect.anything()),
    );
    const payload = api.post.mock.calls.find((c: unknown[]) => c[0] === "/api/trade")![1];
    expect(payload.imgUrl).toBe("https://cdn.example.com/new.png");
  });
});
