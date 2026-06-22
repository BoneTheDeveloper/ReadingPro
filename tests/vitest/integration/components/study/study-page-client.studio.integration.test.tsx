import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudyPageClient } from "@/features/study/ui/study-workspace-client";
import { generateStudioQuestions } from "@/features/study/api-client/studio-questions-client";
import { getArtifactDetail } from "@/features/study/api-client/studio-artifacts-client";
import { createStudyPassage, createStudyQuestion } from "../../../fixtures";
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

describe("StudyPageClient — studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("result-test-1");
    useChatState.messages = [];
    vi.stubGlobal("fetch", defaultFetchHandler());
  });

  it("generates quiz results and opens result detail", async () => {
    const passage = createStudyPassage();
    const question = createStudyQuestion();
    vi.mocked(generateStudioQuestions).mockResolvedValue({
      artifact: {
        id: "result-test-1",
        type: "quiz" as const,
        passageId: passage.id,
        title: passage.title,
        status: "done" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      questions: [question],
    });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(getSourceListItem(passage.title));
    await user.click(screen.getByRole("button", { name: "Quiz" }));

    await waitFor(() =>
      expect(generateStudioQuestions).toHaveBeenCalledWith({
        passageId: passage.id,
        artifactId: expect.any(String),
      }),
    );
    await user.click(await screen.findByRole("button", { name: /Quiz: The Test Passage/ }));
    expect(screen.getByText(question.questionText)).toBeInTheDocument();
  });

  it("lazy-loads questions when opening a persisted quiz artifact after reload", async () => {
    const passage = createStudyPassage();
    const question = createStudyQuestion();
    const persistedArtifact = {
      id: "persisted-quiz-1",
      type: "quiz",
      passageId: passage.id,
      title: passage.title,
      status: "done",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).startsWith("/api/study/studio/artifacts")) {
        return new Response(
          JSON.stringify({ success: true, data: { artifacts: [persistedArtifact] } }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    });
    vi.mocked(getArtifactDetail).mockResolvedValue({ questions: [question] });

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(getSourceListItem(passage.title));

    const card = await screen.findByRole("button", { name: /Quiz: The Test Passage/ });
    await user.click(card);

    await waitFor(() => expect(getArtifactDetail).toHaveBeenCalledWith(persistedArtifact.id));
    expect(await screen.findByText(question.questionText)).toBeInTheDocument();
  });

  it("opens the chat view for the active passage", async () => {
    const passage = createStudyPassage();
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(getSourceListItem(passage.title));
    await user.click(screen.getByRole("button", { name: "Chat" }));
    expect(screen.getByText("Chat: The Test Passage")).toBeInTheDocument();
  });
});
