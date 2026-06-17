import { screen, waitFor } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyChatPanel } from "@/features/study/ui/studio/chat/chat-panel";
import { renderWithUser } from "../../../helpers";

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

const useChatState = vi.hoisted(() => ({
  messages: [],
  sendMessage: vi.fn(),
  setMessages: vi.fn(),
  stop: vi.fn(),
  error: undefined as Error | undefined,
}));

let mockedStatus: ChatStatus = "ready";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: useChatState.messages,
    sendMessage: useChatState.sendMessage,
    status: mockedStatus,
    error: useChatState.error,
    setMessages: useChatState.setMessages,
    stop: useChatState.stop,
  }),
}));

describe("StudyChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStatus = "ready";
    useChatState.messages = [];
    useChatState.error = undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("passage-one")) {
          return new Response(
            JSON.stringify({
              messages: [
                {
                  id: "msg-1",
                  role: "user",
                  parts: [{ type: "text", text: "First message" }],
                },
              ],
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disables sending and shows a stop button while streaming", async () => {
    mockedStatus = "streaming";
    const { user } = renderWithUser(<StudyChatPanel passageId="passage-1" />);

    const input = screen.getByPlaceholderText("Ask about this passage...");
    expect(input).toBeDisabled();

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();

    const stopButton = screen.getByRole("button", { name: "Stop" });
    expect(stopButton).toBeEnabled();

    await user.click(stopButton);
    expect(useChatState.stop).toHaveBeenCalledTimes(1);
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ui:study-chat-stop", op: "ui.action" }),
      expect.any(Function),
    );
  });

  it("hides stop button and allows sending when not streaming", async () => {
    const { user } = renderWithUser(<StudyChatPanel passageId="passage-1" />);

    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText("Ask about this passage...");
    await user.type(input, "What is this about?");

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeEnabled();

    await user.click(sendButton);
    expect(useChatState.sendMessage).toHaveBeenCalledWith({
      text: "What is this about?",
    });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-chat",
        message: "Learner submitted a study chat message",
        data: expect.objectContaining({ messageLength: 19 }),
      }),
    );
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ui:study-chat-send",
        op: "ui.action",
        attributes: expect.objectContaining({
          "study.passage_id": "passage-1",
          "study.message_length": 19,
        }),
      }),
      expect.any(Function),
    );
  });

  it("bootstraps persisted messages for first selected passage", async () => {
    renderWithUser(<StudyChatPanel passageId="passage-one" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/study/chat?passageId=passage-one");
      expect(useChatState.setMessages).toHaveBeenCalledWith([
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "First message" }],
        },
      ]);
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "ui:study-chat-history-fetch",
          op: "http.client",
          attributes: expect.objectContaining({
            "study.passage_id": "passage-one",
            "url.path": "/api/study/chat",
          }),
        }),
        expect.any(Function),
      );
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "study-chat",
          message: "Study chat history loaded",
          data: expect.objectContaining({ passageId: "passage-one", messageCount: 1 }),
        }),
      );
    });
  });

  it("reloads history when the selected passage changes", async () => {
    const { rerender } = renderWithUser(<StudyChatPanel passageId="passage-one" />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    rerender(<StudyChatPanel passageId="passage-two" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/study/chat?passageId=passage-two");
      expect(useChatState.setMessages).toHaveBeenLastCalledWith([]);
    });

    expect(screen.getByPlaceholderText("Ask about this passage...")).toBeInTheDocument();
  });

  it("rejects malformed persisted chat history payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ messages: [{ id: "msg-bad", role: "user" }] }), {
          status: 200,
        }),
      ),
    );

    renderWithUser(<StudyChatPanel passageId="passage-one" />);

    await waitFor(() => {
      expect(useChatState.setMessages).toHaveBeenCalledWith([]);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "study-chat",
          level: "error",
          message: "Study chat history schema error",
          data: expect.objectContaining({
            passageId: "passage-one",
            route: "/api/study/chat",
          }),
        }),
      );
    });
  });

  it("clears messages and falls back to empty state on network fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    renderWithUser(<StudyChatPanel passageId="passage-one" />);

    await waitFor(() => {
      expect(useChatState.setMessages).toHaveBeenCalledWith([]);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(TypeError),
        expect.objectContaining({
          tags: { component: "StudyChatPanel", operation: "history-fetch" },
          extra: { passageId: "passage-one" },
        }),
      );
    });

    expect(
      screen.getByText("Start a conversation about this passage"),
    ).toBeInTheDocument();
  });

  it("displays error bar with retry button when status is error", async () => {
    mockedStatus = "error";
    useChatState.error = new Error("Stream interrupted");

    const { user } = renderWithUser(<StudyChatPanel passageId="passage-one" />);

    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);
    expect(useChatState.sendMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ui:study-chat-retry", op: "ui.action" }),
      expect.any(Function),
    );
  });
});
