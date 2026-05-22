import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudyPageClient } from "@/features/study/study-page-client";
import { studyGenerateQuestionsAction } from "@/features/study/actions/study-generate-questions-action";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import { studyUploadAction } from "@/features/study/actions/study-upload-action";
import { createStudyPassage, createStudyQuestion } from "../../fixtures";
import { renderWithUser } from "../../helpers";

vi.mock("react-resizable-panels", () => ({
  Group: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: ({ className }: { className?: string }) => <div className={className} />,
  useDefaultLayout: () => ({
    defaultLayout: undefined,
    onLayoutChanged: vi.fn(),
  }),
}));

vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({ "aria-label": "dropzone-input" }),
    isDragActive: false,
  }),
}));

vi.mock("@/features/study/actions/study-generate-questions-action", () => ({
  studyGenerateQuestionsAction: vi.fn(),
}));

vi.mock("@/features/study/actions/study-simplify-action", () => ({
  studySimplifyAction: vi.fn(),
}));

vi.mock("@/features/study/actions/study-upload-action", () => ({
  studyUploadAction: vi.fn(),
}));

vi.mock("@/features/study/actions/study-delete-passage-action", () => ({
  studyDeletePassageAction: vi.fn(async () => ({ success: true })),
}));

describe("StudyPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("result-test-1");
  });

  it("renders empty workspace guidance when no sources exist", () => {
    renderWithUser(<StudyPageClient initialPassages={[]} />);

    expect(screen.getAllByText((_, element) => element?.textContent === "noSourcesYetaddSourceToStart").length).toBeGreaterThan(0);
    expect(screen.getByText("selectDocumentFromSources")).toBeInTheDocument();
    expect(screen.getByText("selectPassage")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "quiz" })[0]).toBeDisabled();
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
    const { user } = renderWithUser(<StudyPageClient initialPassages={[first, second]} />);

    await user.type(screen.getByPlaceholderText("searchSources"), "solar");

    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
    await user.click(screen.getByText("Solar Reading"));

    expect(screen.getByText("Simple solar content.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "original (C1)" }));
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
    vi.mocked(studyUploadAction).mockResolvedValue({ passage: uploaded });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[]} />);

    await user.click(screen.getByRole("button", { name: "addSource" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /pasteText copiedText/ }));
    await user.type(screen.getByPlaceholderText("pasteEnglishText"), "A pasted source for the study workspace.");
    await user.click(screen.getByRole("button", { name: "continue" }));

    await waitFor(() => {
      expect(studyUploadAction).toHaveBeenCalledWith({
        text: "A pasted source for the study workspace.",
        title: "pastedTextTitle",
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
    vi.mocked(studySimplifyAction).mockResolvedValue({
      simplifiedContent: "New simple version.",
      simplifiedLevel: "A2",
    });
    const { user, unmount } = renderWithUser(<StudyPageClient initialPassages={[eligible]} />);

    await user.click(screen.getByText(eligible.title));
    await user.click(screen.getByRole("button", { name: "simplify" }));

    await waitFor(() => expect(studySimplifyAction).toHaveBeenCalledWith({ passageId: eligible.id }));
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
    await secondRender.user.click(screen.getByText("Already Simple"));

    expect(screen.queryByRole("button", { name: "simplify" })).not.toBeInTheDocument();
  });

  it("generates quiz results and opens result detail", async () => {
    const passage = createStudyPassage();
    const question = createStudyQuestion();
    vi.mocked(studyGenerateQuestionsAction).mockResolvedValue({ questions: [question] });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    await user.click(screen.getByRole("button", { name: "quiz" }));

    await waitFor(() => expect(studyGenerateQuestionsAction).toHaveBeenCalledWith({ passageId: passage.id }));
    expect(await screen.findByText("Results")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /resultTitle/ }));
    expect(screen.getByText(question.questionText)).toBeInTheDocument();
  });

  it("opens the chat view for the active passage", async () => {
    const passage = createStudyPassage();
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    await user.click(screen.getByRole("button", { name: "chat" }));
    expect(screen.getByText("chatAboutPassage")).toBeInTheDocument();
  });
});
