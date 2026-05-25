import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyChatPanel } from "@/features/study/study-chat-panel";
import { renderWithUser } from "../../helpers";

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

const useChatState = vi.hoisted(() => ({
  messages: [],
  sendMessage: vi.fn(),
  setMessages: vi.fn(),
  stop: vi.fn(),
}));

let mockedStatus: ChatStatus = "ready";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: useChatState.messages,
    sendMessage: useChatState.sendMessage,
    status: mockedStatus,
    error: undefined,
    setMessages: useChatState.setMessages,
    stop: useChatState.stop,
  }),
}));

describe("StudyChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStatus = "ready";
    useChatState.messages = [];
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
  });

  it("bootstraps persisted messages for first selected passage", async () => {
    renderWithUser(<StudyChatPanel passageId="passage-one" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/study-chat?passageId=passage-one");
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
      expect(fetch).toHaveBeenCalledWith("/api/study-chat?passageId=passage-two");
      expect(useChatState.setMessages).toHaveBeenLastCalledWith([]);
    });

    expect(screen.getByPlaceholderText("Ask about this passage...")).toBeInTheDocument();
  });
});
