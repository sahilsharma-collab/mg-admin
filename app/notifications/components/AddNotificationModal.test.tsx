import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddNotificationModal, CONFIRM_PHRASE } from "./AddNotificationModal";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { withQuery: actual.withQuery, apiFetch: (...a: unknown[]) => apiFetch(...a) };
});

// `warning` is part of the mock because the modal now distinguishes a partial
// delivery from a clean one. react-toastify declares it (dist/index.d.ts).
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("react-toastify", () => ({ toast }));

const onClose = vi.fn();
const onNotificationAdded = vi.fn();

const SEND_PATH = "/api/notification/send-notification";

const sends = () =>
  apiFetch.mock.calls.filter((c: unknown[]) => String(c[0]).startsWith(SEND_PATH));

const renderModal = (isOpen = true) =>
  render(
    <AddNotificationModal
      isOpen={isOpen}
      onClose={onClose}
      onNotificationAdded={onNotificationAdded}
    />,
  );

const compose = async (
  title = "Markets closed Friday",
  body = "The desk is shut for the holiday.",
) => {
  const person = userEvent.setup();
  if (title) await person.type(screen.getByPlaceholderText("Notification title"), title);
  if (body) await person.type(screen.getByPlaceholderText("Notification message"), body);
};

const review = () =>
  userEvent.setup().click(screen.getByRole("button", { name: /review broadcast/i }));

const sendButton = () => screen.getByRole("button", { name: /send notification|sending/i });

const arm = (phrase = CONFIRM_PHRASE) =>
  userEvent.setup().type(screen.getByLabelText(/type .* to confirm/i), phrase);

beforeEach(() => {
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith("/api/profile/paginated/all")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ pagination: { totalUsers: 12345 } }),
      });
    }
    // The send endpoint's real success body. It was `{}`, which meant the
    // suite could not tell a broadcast that reached 12,000 devices from one
    // that reached none -- the modal reported success either way, which is the
    // defect this shape now makes visible (MG-BUG-005).
    return Promise.resolve({
      ok: true,
      json: async () => ({
        data: { totalTokens: 2, successCount: 2, failureCount: 0 },
      }),
    });
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// One POST is the entire broadcast: it fans out a push to every registered
// user, there is no draft and no recall endpoint. The first click used to be
// the only click.
describe("AddNotificationModal — the first click never broadcasts", () => {
  it("sends nothing when the compose step is submitted", async () => {
    renderModal();
    await compose();
    await review();

    await waitFor(() => expect(screen.getByText(/confirm broadcast/i)).toBeVisible());
    expect(sends()).toHaveLength(0);
  });

  it("refuses to advance past an empty field", async () => {
    renderModal();
    await compose("Title only", "");
    await review();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Please fill in all fields"));
    expect(screen.queryByText(/confirm broadcast/i)).not.toBeInTheDocument();
    expect(sends()).toHaveLength(0);
  });

  it("shows the exact message that will go out", async () => {
    renderModal();
    await compose();
    await review();

    expect(await screen.findByText("Markets closed Friday")).toBeInTheDocument();
    expect(screen.getByText("The desk is shut for the holiday.")).toBeInTheDocument();
  });

  it("says how many people it reaches and that it cannot be taken back", async () => {
    renderModal();
    await compose();
    await review();

    expect(await screen.findByText(/all 12,345 registered users/)).toBeInTheDocument();
    expect(
      screen.getByText(/cannot be edited,\s*recalled or undone/i),
    ).toBeInTheDocument();
    expect(apiFetch.mock.calls[0][0]).toContain("/api/profile/paginated/all");
  });

  it("still confirms, without inventing a number, when the count cannot be read", async () => {
    apiFetch.mockImplementation((path: string) =>
      path.startsWith("/api/profile/paginated/all")
        ? Promise.resolve({ ok: false, statusText: "Forbidden" })
        : Promise.resolve({ ok: true, json: async () => ({}) }),
    );
    renderModal();
    await compose();
    await review();

    expect(await screen.findByText(/every registered user/)).toBeInTheDocument();
    expect(screen.queryByText(/all 0 registered users/)).not.toBeInTheDocument();
  });
});

describe("AddNotificationModal — the confirm step cannot be hit by muscle memory", () => {
  it("keeps the send disabled until the phrase is typed", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);

    expect(sendButton()).toBeDisabled();
  });

  it("stays disabled for a phrase that is not the one asked for", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm("YES");

    expect(sendButton()).toBeDisabled();
    await userEvent.setup().click(sendButton());
    expect(sends()).toHaveLength(0);
  });

  it("stays disabled for a prefix of the phrase", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm(CONFIRM_PHRASE.slice(0, CONFIRM_PHRASE.length - 1));

    expect(sendButton()).toBeDisabled();
  });

  it("stays disabled for a string that merely contains the phrase", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm(`${CONFIRM_PHRASE}ING`);

    expect(sendButton()).toBeDisabled();
  });

  it("backing out to editing disarms the confirmation", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm();
    await userEvent.setup().click(screen.getByRole("button", { name: /back to editing/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Notification title")).toBeVisible(),
    );
    expect(sends()).toHaveLength(0);

    await review();
    expect(await screen.findByLabelText(/type .* to confirm/i)).toHaveValue("");
    expect(sendButton()).toBeDisabled();
  });

  it("cancelling from the confirm step sends nothing and reopens at compose", async () => {
    const { rerender } = renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm();
    await userEvent.setup().click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(sends()).toHaveLength(0);

    rerender(
      <AddNotificationModal
        isOpen
        onClose={onClose}
        onNotificationAdded={onNotificationAdded}
      />,
    );
    expect(await screen.findByPlaceholderText("Notification title")).toBeVisible();
    expect(screen.queryByText(/confirm broadcast/i)).not.toBeInTheDocument();
  });
});

// The over-fix direction: a gate that never lets the broadcast through would
// pass everything above and be just as useless.
describe("AddNotificationModal — a deliberately confirmed broadcast goes out", () => {
  it("POSTs exactly what was previewed, once", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm();
    await userEvent.setup().click(sendButton());

    await waitFor(() => expect(sends()).toHaveLength(1));
    const [path, init] = sends()[0];
    expect(path).toBe(SEND_PATH);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      title: "Markets closed Friday",
      body: "The desk is shut for the holiday.",
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Notification sent to 2 device(s)",
    );
    expect(onNotificationAdded).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });


  // The whole point of MG-BUG-005: the API answers 200 with "stored but no
  // users to notify", and the modal used to show a green success toast for it.
  // An operator had no way to tell a delivered broadcast from a silent one.
  it("reports a broadcast that reached nobody as a failure, not a success", async () => {
    apiFetch.mockImplementation((path: string) =>
      path.startsWith("/api/profile/paginated/all")
        ? Promise.resolve({
            ok: true,
            json: async () => ({ pagination: { totalUsers: 12345 } }),
          })
        : Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              message: "Notification stored but no users to notify",
            }),
          }),
    );

    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm();
    await userEvent.setup().click(sendButton());

    await waitFor(() => expect(sends()).toHaveLength(1));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/no push tokens matched/i),
    );
  });

  it("surfaces a partial delivery instead of calling it a clean send", async () => {
    apiFetch.mockImplementation((path: string) =>
      path.startsWith("/api/profile/paginated/all")
        ? Promise.resolve({
            ok: true,
            json: async () => ({ pagination: { totalUsers: 12345 } }),
          })
        : Promise.resolve({
            ok: true,
            json: async () => ({
              data: { totalTokens: 10, successCount: 7, failureCount: 3 },
            }),
          }),
    );

    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm();
    await userEvent.setup().click(sendButton());

    await waitFor(() => expect(sends()).toHaveLength(1));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringMatching(/7 device\(s\); 3 failed/),
    );
  });

  it("Enter on a wrong phrase says what is needed instead of sending", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm("YES{Enter}");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        `Type ${CONFIRM_PHRASE} to confirm this broadcast`,
      ),
    );
    expect(sends()).toHaveLength(0);
    // A rejected Enter must not arm the field on the operator's behalf: the
    // next Enter would then go out on a keystroke nobody meant as a decision.
    expect(screen.getByLabelText(/type .* to confirm/i)).toHaveValue("YES");
    expect(sendButton()).toBeDisabled();
  });

  it("Enter on the right phrase sends, once", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm(`${CONFIRM_PHRASE}{Enter}`);

    await waitFor(() => expect(sends()).toHaveLength(1));
    expect(sends()[0][0]).toBe(SEND_PATH);
  });

  it("accepts the phrase whatever case it is typed in", async () => {
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm(CONFIRM_PHRASE.toLowerCase());

    expect(sendButton()).toBeEnabled();
  });

  it("does not report a broadcast the API refused", async () => {
    apiFetch.mockImplementation((path: string) =>
      path.startsWith("/api/profile/paginated/all")
        ? Promise.resolve({ ok: true, json: async () => ({ pagination: { totalUsers: 3 } }) })
        : Promise.resolve({ ok: false, statusText: "Bad Gateway" }),
    );
    renderModal();
    await compose();
    await review();
    await screen.findByText(/confirm broadcast/i);
    await arm();
    await userEvent.setup().click(sendButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to send notification"),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(onNotificationAdded).not.toHaveBeenCalled();
  });
});
