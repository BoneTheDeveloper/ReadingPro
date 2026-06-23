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

  it("bootstraps persisted messages for first selected passage", async () => {
    renderWithUser(<StudyChatPanel passageId="passage-one" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/study/studio/chat?passageId=passage-one");
      expect(useChatState.setMessages).toHaveBeenCalledWith([
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "First message" }],
        },
      ]);
    });
  });

  it("reloads history when the selected passage changes", async () => {
    const { rerender } = renderWithUser(<StudyChatPanel passageId="passage-one" />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    rerender(<StudyChatPanel passageId="passage-two" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/study/studio/chat?passageId=passage-two");
      expect(useChatState.setMessages).toHaveBeenLastCalledWith([]);
    });
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
  });
});
