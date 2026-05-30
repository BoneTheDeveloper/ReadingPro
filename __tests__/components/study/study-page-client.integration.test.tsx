import { fireEvent, screen, waitFor } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyPageClient } from "@/features/study/study-page-client";
import { studyGenerateQuestionsAction } from "@/features/study/actions/study-generate-questions-action";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import { studyUploadAction } from "@/features/study/actions/study-upload-action";
import { extractSelectionInfo } from "@/features/study/study-selection-utils";
import { createStudyPassage, createStudyQuestion } from "../../fixtures";
import { renderWithUser } from "../../helpers";

const useChatState = vi.hoisted(() => ({
  messages: [],
  sendMessage: vi.fn(),
  setMessages: vi.fn(),
  stop: vi.fn(),
}));

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function translationResponse(translation: string, provider = "dictionary") {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        translation,
        type: "noun phrase",
        provider,
      },
    }),
    { status: 200 },
  );
}

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

vi.mock("@/features/study/study-selection-utils", () => ({
  extractSelectionInfo: vi.fn(),
}));

function getPopupTranslateButton() {
  return screen.getAllByRole("button", { name: /Translate/ }).find(
    (btn) => btn.closest(".fixed"),
  )!;
}

describe("StudyPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("result-test-1");
    useChatState.messages = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : null;

        if (url === "/api/translate" && body?.mode === "quick") {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                translation: "thiên lệch thuật toán",
                type: "noun phrase",
                provider: "dictionary",
              },
            }),
            { status: 200 },
          );
        }

        if (url === "/api/translate" && body?.mode === "detailed") {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                translation: "thiên lệch thuật toán",
                explanation: "A systematic unfair pattern in automated decisions.",
                meaningInSentence: "The term describes a risk in hiring systems.",
                sentenceTranslation:
                  "Các mối quan tâm chính bao gồm thiên lệch thuật toán trong hệ thống tuyển dụng tự động.",
                examples: ["Teams audit algorithmic bias before launch."],
                relatedWords: ["fairness"],
                pronunciation: null,
                type: "noun phrase",
                provider: "ai",
              },
            }),
            { status: 200 },
          );
        }

        if (url === "/api/vocabulary") {
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "vocab-1" },
            }),
            { status: 200 },
          );
        }

        if (url.startsWith("/api/study-chat")) {
          return new Response(JSON.stringify({ messages: [] }), { status: 200 });
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders empty workspace guidance when no sources exist", () => {
    renderWithUser(<StudyPageClient initialPassages={[]} />);

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          /No sources yet\..*Add a source to get started\./i.test(
            element.textContent ?? "",
          ),
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
    const { user } = renderWithUser(<StudyPageClient initialPassages={[first, second]} />);

    await user.type(screen.getByPlaceholderText("Search sources..."), "solar");

    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
    await user.click(screen.getByText("Solar Reading"));

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
    vi.mocked(studyUploadAction).mockResolvedValue({ passage: uploaded });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[]} />);

    await user.click(screen.getByRole("button", { name: "Add Source" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Paste text Copied text/ }));
    await user.type(screen.getByPlaceholderText("Paste your English text content here..."), "A pasted source for the study workspace.");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(studyUploadAction).toHaveBeenCalledWith({
        text: "A pasted source for the study workspace.",
        title: "Pasted Text",
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
    await user.click(screen.getByRole("button", { name: "Simplify" }));

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

    expect(screen.queryByRole("button", { name: "Simplify" })).not.toBeInTheDocument();
  });

  it("generates quiz results and opens result detail", async () => {
    const passage = createStudyPassage();
    const question = createStudyQuestion();
    vi.mocked(studyGenerateQuestionsAction).mockResolvedValue({ questions: [question] });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    await user.click(screen.getByRole("button", { name: "Quiz" }));

    await waitFor(() => expect(studyGenerateQuestionsAction).toHaveBeenCalledWith({ passageId: passage.id }));
    expect(await screen.findByText("Results")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Quiz: The Test Passage/ }));
    expect(screen.getByText(question.questionText)).toBeInTheDocument();
  });

  it("opens the chat view for the active passage", async () => {
    const passage = createStudyPassage();
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    await user.click(screen.getByRole("button", { name: "Chat" }));
    expect(screen.getByText("Chat: The Test Passage")).toBeInTheDocument();
  });

  it("does not auto-translate on selection; requires translate icon click", async () => {
    const passage = createStudyPassage({
      content: "Key concerns include algorithmic bias in automated hiring systems.",
      simplifiedContent: null,
      originalLevel: "B2",
      wordCount: 8,
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "algorithmic bias",
      selectionRect: { top: 120, left: 160, width: 80, height: 20 },
      contextSentence: "Key concerns include algorithmic bias in automated hiring systems.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    fireEvent.mouseUp(screen.getByText(/Key concerns include algorithmic bias/));

    // Selection captured — translate icon appears, no fetch yet
    const allTranslateBtns = await screen.findAllByRole("button", { name: /Translate/ });
    const popupTranslateBtn = allTranslateBtns.find((btn) => btn.closest(".fixed"));
    expect(popupTranslateBtn).toBeTruthy();
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/translate",
      expect.anything(),
    );
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
        message: "study-translation-selection-captured",
        data: expect.objectContaining({ selectedTextLength: 16 }),
      }),
    );

    // Click translate icon to trigger quick translation
    await user.click(popupTranslateBtn!);
    expect(await screen.findByText("thiên lệch thuật toán")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/translate",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"mode":"quick"'),
      }),
    );
  });

  it("shows a local warning for oversized selections without calling translate", async () => {
    const longSelection = "a".repeat(501);
    const passage = createStudyPassage({
      content: longSelection,
      simplifiedContent: null,
      originalLevel: "B2",
      wordCount: 1,
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: longSelection,
      selectionRect: { top: 120, left: 160, width: 120, height: 20 },
      contextSentence: longSelection,
      sourceId: passage.id,
      targetLanguage: "vi",
    });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    fireEvent.mouseUp(screen.getByText(longSelection));

    expect(await screen.findByText("Selection too long")).toBeInTheDocument();
    expect(screen.getByText("501 / 500")).toBeInTheDocument();
    expect(
      screen.queryAllByRole("button", { name: /^Translate$/ }).find((button) =>
        button.className.includes("fixed"),
      ),
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalledWith("/api/translate", expect.anything());
  });

  it("shows quick translation without Save vocabulary and opens details on demand", async () => {
    const passage = createStudyPassage({
      content: "Key concerns include algorithmic bias in automated hiring systems.",
      simplifiedContent: null,
      originalLevel: "B2",
      wordCount: 8,
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "algorithmic bias",
      selectionRect: { top: 120, left: 160, width: 80, height: 20 },
      contextSentence: "Key concerns include algorithmic bias in automated hiring systems.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    fireEvent.mouseUp(screen.getByText(/Key concerns include algorithmic bias/));
    await user.click(getPopupTranslateButton());

    // Quick popup shows translation but no Save vocabulary action
    expect(await screen.findByText("thiên lệch thuật toán")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save/ })).not.toBeInTheDocument();

    // Open details triggers detailed translation
    await user.click(screen.getByRole("button", { name: /Open details/ }));
    expect(await screen.findByText("Translate: algorithmic bias")).toBeInTheDocument();
    expect(await screen.findByText("A systematic unfair pattern in automated decisions.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/translate",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"mode":"detailed"'),
      }),
    );
  });

  it("omits null quick translation type when saving vocabulary from details", async () => {
    const passage = createStudyPassage({
      content: "Quorvex drift appears here.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    let vocabularyBody: Record<string, unknown> | null = null;
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;

      if (url === "/api/translate" && body?.mode === "quick") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              translation: "quorvex sự trôi",
              type: null,
              provider: "fallback",
            },
          }),
          { status: 200 },
        );
      }

      if (url === "/api/translate" && body?.mode === "detailed") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              translation: "quorvex sự trôi",
              explanation: "A fallback phrase used for testing.",
              meaningInSentence: null,
              sentenceTranslation: "Quorvex drift xuất hiện ở đây.",
              examples: [],
              relatedWords: [],
              pronunciation: null,
              type: null,
              provider: "ai",
            },
          }),
          { status: 200 },
        );
      }

      if (url === "/api/vocabulary") {
        vocabularyBody = body;
        return new Response(JSON.stringify({ success: true, data: { id: "vocab-fallback" } }), {
          status: 200,
        });
      }

      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "quorvex drift",
      selectionRect: { top: 120, left: 160, width: 90, height: 20 },
      contextSentence: "Quorvex drift appears here.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
    await user.click(screen.getByText(passage.title));
    fireEvent.mouseUp(screen.getByText(/Quorvex drift appears here/));
    await user.click(getPopupTranslateButton());
    expect(await screen.findByText("quorvex sự trôi")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Open details/ }));
    await user.click(await screen.findByRole("button", { name: /Save/ }));

    await waitFor(() => {
      expect(vocabularyBody).toEqual(
        expect.objectContaining({
          selectedText: "quorvex drift",
          translation: "quorvex sự trôi",
        }),
      );
    });
    expect(vocabularyBody).not.toHaveProperty("type");
  });

  it("clears stale translation selection on mode change and does not open a custom context menu", async () => {
    const passage = createStudyPassage({
      content: "Original text contains algorithmic bias.",
      simplifiedContent: "Simple text contains algorithmic bias.",
      originalLevel: "B2",
      simplifiedLevel: "A2",
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "algorithmic bias",
      selectionRect: { top: 120, left: 160, width: 80, height: 20 },
      contextSentence: "Simple text contains algorithmic bias.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(screen.getByText(passage.title));
    fireEvent.mouseUp(screen.getByText(/Simple text contains algorithmic bias/));
    await user.click(getPopupTranslateButton());
    expect(await screen.findByText("thiên lệch thuật toán")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Original (B2)" }));
    expect(screen.queryByText("thiên lệch thuật toán")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText(/Original text contains algorithmic bias/));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("ignores stale quick translation responses after rapid reselection", async () => {
    const passage = createStudyPassage({
      content: "First term appears here.\n\nSecond term appears here.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    const first = deferredResponse();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      if (url === "/api/translate" && body?.text === "first term") return first.promise;
      if (url === "/api/translate" && body?.text === "second term") {
        return translationResponse("ban dich thu hai");
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    });
    vi.mocked(extractSelectionInfo)
      .mockReturnValueOnce({
        selectedText: "first term",
        selectionRect: { top: 120, left: 160, width: 80, height: 20 },
        contextSentence: "First term appears here.",
        sourceId: passage.id,
        targetLanguage: "vi",
      })
      .mockReturnValueOnce({
        selectedText: "second term",
        selectionRect: { top: 150, left: 160, width: 90, height: 20 },
        contextSentence: "Second term appears here.",
        sourceId: passage.id,
        targetLanguage: "vi",
      });

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
    await user.click(screen.getByText(passage.title));

    // Select first term, click translate
    fireEvent.mouseUp(screen.getByText(/First term appears here/));
    await user.click(getPopupTranslateButton());

    // Select second term (supersedes first selection)
    fireEvent.mouseUp(screen.getByText(/Second term appears here/));
    await user.click(getPopupTranslateButton());

    expect(await screen.findByText("ban dich thu hai")).toBeInTheDocument();
    first.resolve(translationResponse("ban dich thu nhat"));

    await waitFor(() => {
      expect(screen.queryByText("ban dich thu nhat")).not.toBeInTheDocument();
      expect(screen.getByText("ban dich thu hai")).toBeInTheDocument();
    });
  });

  it("shows a quick translation error and breadcrumb for API failures", async () => {
    const passage = createStudyPassage({
      content: "Unknown phrase appears here.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/translate") {
        return new Response(JSON.stringify({ error: "Unable to translate." }), { status: 500 });
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "Unknown phrase",
      selectionRect: { top: 120, left: 160, width: 90, height: 20 },
      contextSentence: "Unknown phrase appears here.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
    await user.click(screen.getByText(passage.title));
    fireEvent.mouseUp(screen.getByText(/Unknown phrase appears here/));
    await user.click(getPopupTranslateButton());

    expect(await screen.findByText("Translation failed")).toBeInTheDocument();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
        level: "error",
        message: "study-translation-quick-error",
      }),
    );
  });

  it("does not send duplicate requests for rapid translate icon clicks", async () => {
    const passage = createStudyPassage({
      content: "Rapid click test content.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    const deferred = deferredResponse();
    let quickRequestCount = 0;
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      if (url === "/api/translate" && body?.mode === "quick") {
        quickRequestCount++;
        return deferred.promise;
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "Rapid click",
      selectionRect: { top: 120, left: 160, width: 80, height: 20 },
      contextSentence: "Rapid click test content.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
    await user.click(screen.getByText(passage.title));
    fireEvent.mouseUp(screen.getByText(/Rapid click test content/));

    // Click translate button multiple times rapidly
    const translateBtn = getPopupTranslateButton();
    await user.click(translateBtn);
    await user.click(translateBtn);
    await user.click(translateBtn);

    // Only one quick request should have been sent (loading guard)
    expect(quickRequestCount).toBe(1);

    deferred.resolve(translationResponse("click nhanh"));
    expect(await screen.findByText("click nhanh")).toBeInTheDocument();
  });
});
