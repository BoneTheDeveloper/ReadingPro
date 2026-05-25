import { screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudyChatPanel } from "@/features/study/study-chat-panel";
import { renderWithUser } from "../../helpers";

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

const stopMock = vi.fn();
const sendMessageMock = vi.fn();

let mockedStatus: ChatStatus = "ready";

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: sendMessageMock,
    status: mockedStatus,
    error: undefined,
    regenerate: vi.fn(),
    stop: stopMock,
  })),
}));

describe("StudyChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStatus = "ready";
  });

  it("disables sending and shows a stop button while streaming", async () => {
    mockedStatus = "streaming";
    const { user } = renderWithUser(
      <StudyChatPanel passageId="passage-1" passageTitle="Passage" />,
    );

    const input = screen.getByPlaceholderText("Ask about this passage...");
    expect(input).toBeDisabled();

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();

    const stopButton = screen.getByRole("button", { name: "Stop" });
    expect(stopButton).toBeEnabled();

    await user.click(stopButton);
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it("hides stop button and allows sending when not streaming", async () => {
    const { user } = renderWithUser(
      <StudyChatPanel passageId="passage-1" passageTitle="Passage" />,
    );

    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText("Ask about this passage...");
    await user.type(input, "What is this about?");

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeEnabled();

    await user.click(sendButton);
    expect(sendMessageMock).toHaveBeenCalledWith({ text: "What is this about?" });
  });
});
