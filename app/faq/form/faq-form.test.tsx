import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FAQForm from "./faq-form";

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api }));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

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

const submit = () => userEvent.setup().click(screen.getByRole("button"));

const fill = async (question: string, answer: string) => {
  const person = userEvent.setup();
  await person.type(screen.getByPlaceholderText("Enter your question"), question);
  await person.type(screen.getByPlaceholderText("Provide the answer"), answer);
};

beforeEach(() => {
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
  api.get.mockResolvedValue({
    data: { faq: { question: "Old question", answer: "Old answer" } },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("FAQForm — create", () => {
  it("does not write until both fields are filled", async () => {
    render(<FAQForm />);
    await submit();

    await waitFor(() => expect(screen.getByText("Question is required")).toBeVisible());
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("rejects whitespace-free emptiness in the answer too", async () => {
    render(<FAQForm />);
    await userEvent
      .setup()
      .type(screen.getByPlaceholderText("Enter your question"), "Q?");
    await submit();

    await waitFor(() => expect(screen.getByText("Answer is required")).toBeVisible());
    expect(api.post).not.toHaveBeenCalled();
  });

  it("POSTs to the collection, not to an id", async () => {
    render(<FAQForm />);
    await fill("How do I reset?", "Use the link.");
    await submit();

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    expect(api.post.mock.calls[0][0]).toBe("/api/faq");
    expect(api.put).not.toHaveBeenCalled();
  });

  it("sends exactly the two fields the API's contract declares", async () => {
    render(<FAQForm />);
    await fill("How do I reset?", "Use the link.");
    await submit();

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    expect(api.post.mock.calls[0][1]).toEqual({
      question: "How do I reset?",
      answer: "Use the link.",
    });
  });

  it("returns to the list and refreshes it once the write lands", async () => {
    render(<FAQForm />);
    await fill("Q?", "A.");
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/faq"));
    expect(refresh).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("FAQ created successfully.");
  });

  it("surfaces the API's own rejection message", async () => {
    api.post.mockRejectedValue(
      new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409,
        data: { message: "That question already exists." },
      } as never),
    );
    render(<FAQForm />);
    await fill("Q?", "A.");
    await submit();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("That question already exists."),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("stays on the form, and says why, when the API refuses", async () => {
    api.post.mockRejectedValue(new Error("boom"));
    render(<FAQForm />);
    await fill("Q?", "A.");
    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("FAQForm — edit", () => {
  it("loads the existing FAQ into the fields", async () => {
    render(<FAQForm faqId="7" />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter your question")).toHaveValue(
        "Old question",
      ),
    );
    expect(api.get).toHaveBeenCalledWith("/api/faq/7", expect.anything());
  });

  it("PUTs to the record's own id", async () => {
    render(<FAQForm faqId="7" />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter your question")).toHaveValue(
        "Old question",
      ),
    );

    await submit();

    await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
    expect(api.put.mock.calls[0][0]).toBe("/api/faq/7");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("does not echo an id back in the body", async () => {
    render(<FAQForm faqId="7" />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter your question")).toHaveValue(
        "Old question",
      ),
    );

    await submit();

    await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
    expect(Object.keys(api.put.mock.calls[0][1]).sort()).toEqual([
      "answer",
      "question",
    ]);
  });

  it("labels itself as an edit rather than a create", async () => {
    render(<FAQForm faqId="7" />);

    expect(screen.getByRole("heading", { name: "Edit FAQ" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Update"));
  });
});
