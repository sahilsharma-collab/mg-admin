import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PostPage from "./PostPage";

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-toastify", () => ({ toast }));

// next/image needs a loader and a configured host; the markup it produces is
// not what this suite is about.
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const reply = (id: number, content: string, authorId: number, replies = []) => ({
  id,
  content,
  imageUrl: null,
  authorId,
  postId: 1,
  parentId: null,
  isBlocked: false,
  createdAt: "2025-01-02T10:00:00.000Z",
  updatedAt: "2025-01-02T10:00:00.000Z",
  author: { userName: `user${authorId}`, imgUrl: null, role: "USER" },
  reactions: [],
  replies,
});

const post = {
  id: 1,
  title: "EURUSD thread",
  content: "Thoughts?",
  imageUrl: null,
  authorId: 5,
  isBlocked: false,
  createdAt: "2025-01-01T10:00:00.000Z",
  updatedAt: "2025-01-01T10:00:00.000Z",
  reactions: [],
  author: { id: 5, userName: "poster", imgUrl: null, role: "USER" },
  replies: [reply(101, "First reply", 7), reply(102, "Second reply", 8)],
};

const deletes = () =>
  apiFetch.mock.calls.filter((c: unknown[]) => c[1] && (c[1] as RequestInit).method === "DELETE");

const openRepliesTab = async () => {
  render(<PostPage postId={1} />);
  await screen.findByText("EURUSD thread");
  await userEvent.setup().click(screen.getByRole("tab", { name: /replies/i }));
  await screen.findByText("First reply");
};

const openReplyMenu = async (content: string) => {
  const row = screen.getByText(content).closest("tr")!;
  await userEvent.setup().click(within(row).getByRole("button"));
  await screen.findByText("Delete Reply");
};

const clickButton = (name: RegExp) =>
  userEvent.setup().click(screen.getByRole("button", { name }));

beforeEach(() => {
  apiFetch.mockImplementation((_path: string, init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      statusText: "OK",
      json: async () =>
        init?.method === "DELETE" ? { message: "Reply deleted" } : { post },
    }),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Suspend User, the item directly beneath this one in the same menu, has always
// armed a confirmation (PostPage.tsx, "Suspend User Confirmation Dialog"), and
// the sibling PostCard confirms too. Delete Reply firing on the menu click was
// an inconsistency inside one screen, not a house style.
describe("PostPage — Delete Reply", () => {
  it("asks before it deletes anything", async () => {
    await openRepliesTab();
    await openReplyMenu("First reply");
    await userEvent.setup().click(screen.getByText("Delete Reply"));

    await waitFor(() => expect(screen.getByText("Are you sure?")).toBeVisible());
    expect(deletes()).toHaveLength(0);
    expect(screen.getByText("First reply")).toBeInTheDocument();
  });

  it("warns that the nested replies go with it", async () => {
    await openRepliesTab();
    await openReplyMenu("First reply");
    await userEvent.setup().click(screen.getByText("Delete Reply"));

    // waitFor, not a bare findByText: the modal fades in from opacity 0, and
    // toBeVisible reads that as hidden until the animation settles.
    await waitFor(() =>
      expect(screen.getByText(/every nested reply under it disappear/i)).toBeVisible(),
    );
  });

  it("sends nothing when the operator backs out", async () => {
    await openRepliesTab();
    await openReplyMenu("First reply");
    await userEvent.setup().click(screen.getByText("Delete Reply"));
    await screen.findByText("Are you sure?");
    await clickButton(/^cancel$/i);

    await waitFor(() =>
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument(),
    );
    expect(deletes()).toHaveLength(0);
  });

  // The other direction: a dialog that never lets the delete through would pass
  // every assertion above and be just as broken.
  it("deletes the reply the menu was opened on, and only on confirmation", async () => {
    await openRepliesTab();
    await openReplyMenu("Second reply");
    await userEvent.setup().click(screen.getByText("Delete Reply"));
    await screen.findByText("Are you sure?");
    await clickButton(/^confirm$/i);

    await waitFor(() => expect(deletes()).toHaveLength(1));
    expect(deletes()[0][0]).toBe("/api/post/reply/102");
    expect(toast.success).toHaveBeenCalledWith("Reply deleted");
    await waitFor(() => expect(screen.queryByText("Second reply")).not.toBeInTheDocument());
    expect(screen.getByText("First reply")).toBeInTheDocument();
  });

  it("does not report a deletion the API refused", async () => {
    apiFetch.mockImplementation((_path: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? Promise.resolve({ ok: false, statusText: "Conflict" })
        : Promise.resolve({ ok: true, statusText: "OK", json: async () => ({ post }) }),
    );
    await openRepliesTab();
    await openReplyMenu("First reply");
    await userEvent.setup().click(screen.getByText("Delete Reply"));
    await screen.findByText("Are you sure?");
    await clickButton(/^confirm$/i);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to delete reply"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText("First reply")).toBeInTheDocument();
  });

  it("closes the dialog once the delete lands, so a second click cannot repeat it", async () => {
    await openRepliesTab();
    await openReplyMenu("First reply");
    await userEvent.setup().click(screen.getByText("Delete Reply"));
    await screen.findByText("Are you sure?");
    await clickButton(/^confirm$/i);

    await waitFor(() => expect(deletes()).toHaveLength(1));
    await waitFor(() =>
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument(),
    );
  });
});

// The neighbour this action was made to match.
describe("PostPage — Suspend User still confirms", () => {
  it("opens its dialog rather than suspending", async () => {
    await openRepliesTab();
    await openReplyMenu("First reply");
    await userEvent.setup().click(screen.getByText("Suspend User"));

    await waitFor(() =>
      expect(screen.getByText(/confirm user suspension/i)).toBeVisible(),
    );
    expect(
      apiFetch.mock.calls.filter((c: unknown[]) => String(c[0]).includes("/api/profile/block/")),
    ).toHaveLength(0);
  });
});
