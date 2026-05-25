import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudyChatPanel } from "@/features/study/study-chat-panel";
import { renderWithUser } from "../../helpers";

const useChatState = vi.hoisted(() => ({
  setMessages: vi.fn(),
  sendMessage: vi.fn(),
  regenerate: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: useChatState.sendMessage,
    status: "ready",
    error: undefined,
    regenerate: useChatState.regenerate,
    setMessages: useChatState.setMessages,
  }),
}));

describe("StudyChatPanel persistence bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("passage-one")) {
          return new Response(
            JSON.stringify({
              messages: [{ id: "msg-1", role: "user", parts: [{ type: "text", text: "First message" }] }],
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }),
    );
  });

  it("bootstraps persisted messages for first selected passage", async () => {
    renderWithUser(<StudyChatPanel passageId="passage-one" passageTitle="Passage One" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/study-chat?passageId=passage-one");
      expect(useChatState.setMessages).toHaveBeenCalledWith([
        { id: "msg-1", role: "user", parts: [{ type: "text", text: "First message" }] },
      ]);
    });
  });

  it("reloads history when the selected passage changes", async () => {
    const { rerender } = renderWithUser(
      <StudyChatPanel passageId="passage-one" passageTitle="Passage One" />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    rerender(<StudyChatPanel passageId="passage-two" passageTitle="Passage Two" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/study-chat?passageId=passage-two");
      expect(useChatState.setMessages).toHaveBeenLastCalledWith([]);
    });

    expect(screen.getByPlaceholderText("Ask a question about this passage..."));
  });
});
