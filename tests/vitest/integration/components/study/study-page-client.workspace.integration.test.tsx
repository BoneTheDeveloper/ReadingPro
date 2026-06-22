import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudyPageClient } from "@/features/study/ui/study-workspace-client";
import { simplifyPassage, createPassage } from "@/features/study/api-client/passages-client";
import { createStudyPassage } from "../../../fixtures";
import { renderWithUser } from "../../../helpers";
import {
  defaultFetchHandler,
  getSourceListItem,
} from "./study-page-client.shared";

const useChatState = vi.hoisted(() => ({
  messages: [],
  sendMessage: vi.fn(),
  setMessages: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: useChatState.messages,
    sendMessage: useChatState.sendMessage,
    status: "ready",
    error: undefined,
    setMessages: useChatState.setMessages,
    stop: useChatState.stop,
  }),
}));
vi.mock("react-resizable-panels", () => ({
  Group: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: ({ className }: { className?: string }) => <div className={className} />,
  useDefaultLayout: () => ({ defaultLayout: undefined, onLayoutChanged: vi.fn() }),
}));
vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({ "aria-label": "dropzone-input" }),
    isDragActive: false,
  }),
}));
vi.mock("@/features/study/api-client/studio-questions-client", () => ({
  generateStudioQuestions: vi.fn(),
}));
vi.mock("@/features/study/api-client/passages-client", () => ({
  simplifyPassage: vi.fn(),
  createPassage: vi.fn(),
  deletePassage: vi.fn(async () => true),
}));
vi.mock("@/features/study/api-client/studio-artifacts-client", () => ({
  getArtifactDetail: vi.fn(),
  recordQuizResult: vi.fn(),
  resetQuizResult: vi.fn(),
}));
vi.mock("@/features/study/model/selection-utils", () => ({
  extractSelectionInfo: vi.fn(),
}));

describe("StudyPageClient — workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("result-test-1");
    useChatState.messages = [];
    vi.stubGlobal("fetch", defaultFetchHandler());
  });

  it("renders empty workspace guidance when no sources exist", () => {
    renderWithUser(<StudyPageClient initialPassages={[]} />);

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          /No sources yet\..*Add a source to get started\./i.test(element.textContent ?? ""),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Select a document from Sources")).toBeInTheDocument();
    expect(screen.getByText("Select a passage")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Quiz" })[0]).toBeDisabled();
  });

  it("filters sources, selects a document, and switches content modes", async () => {
    const first = createStudyPassage();
    const second = createStudyPassage({
      id: "passage-second",
      title: "Solar Reading",
      content: "Original solar content.",
      simplifiedContent: "Simple solar content.",
      originalLevel: "C1",
      simplifiedLevel: "B1",
      createdAt: first.createdAt + 1000,
    });
    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[first, second]} />,
    );

    await user.type(screen.getByPlaceholderText("Search sources..."), "solar");

    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
    await user.click(getSourceListItem("Solar Reading"));

    expect(screen.getByText("Simple solar content.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Original (C1)" }));
    expect(screen.getByText("Original solar content.")).toBeInTheDocument();
  });

  it("uploads pasted text through the modal and selects the uploaded passage", async () => {
    const uploaded = createStudyPassage({
      id: "uploaded-passage",
      title: "Uploaded Text",
      content: "Uploaded text content.",
      simplifiedContent: null,
      originalLevel: "B1",
      simplifiedLevel: null,
      createdAt: Date.UTC(2026, 4, 22),
    });
    vi.mocked(createPassage).mockResolvedValue(uploaded);
    const { user } = renderWithUser(<StudyPageClient initialPassages={[]} />);

    await user.click(screen.getAllByRole("button", { name: "Add Source" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Paste text$/ }));
    await user.type(
      screen.getByPlaceholderText("Paste your English text content here..."),
      "A pasted source for the study workspace.",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(createPassage).toHaveBeenCalledWith({
        text: "A pasted source for the study workspace.",
        title: "Pasted Text",
        sourceType: "TEXT",
      });
    });
    expect((await screen.findAllByText("Uploaded Text")).length).toBeGreaterThan(0);
    expect(screen.getByText("Uploaded text content.")).toBeInTheDocument();
  });

  it("simplifies eligible content and hides simplify for A1/A2 passages", async () => {
    const eligible = createStudyPassage({
      simplifiedContent: null,
      simplifiedLevel: null,
      originalLevel: "B2",
    });
    vi.mocked(simplifyPassage).mockResolvedValue({
      simplifiedContent: "New simple version.",
      simplifiedLevel: "A2",
    });
    const { user, unmount } = renderWithUser(
      <StudyPageClient initialPassages={[eligible]} />,
    );

    await user.click(getSourceListItem(eligible.title));
    await user.click(screen.getByRole("button", { name: "Simplify" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(simplifyPassage).toHaveBeenCalledWith(eligible.id));
    expect(await screen.findByText("New simple version.")).toBeInTheDocument();

    unmount();
    const simple = createStudyPassage({
      id: "a2-passage",
      title: "Already Simple",
      simplifiedContent: null,
      simplifiedLevel: null,
      originalLevel: "A2",
    });
    const secondRender = renderWithUser(<StudyPageClient initialPassages={[simple]} />);
    await secondRender.user.click(getSourceListItem("Already Simple"));

    await secondRender.user.click(screen.getByRole("button", { name: "Simplify" }));
    expect(await screen.findByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(simplifyPassage).not.toHaveBeenCalledWith("a2-passage");
  });
});
