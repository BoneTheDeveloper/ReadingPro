import { fireEvent, screen, waitFor } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyPageClient } from "@/features/study/ui/study-workspace-client";
import { generateStudioQuestions } from "@/features/study/api-client/studio-questions-client";
import { simplifyPassage, createPassage } from "@/features/study/api-client/passages-client";
import { getArtifactDetail } from "@/features/study/api-client/studio-artifacts-client";
import { extractSelectionInfo } from "@/features/study/model/selection-utils";

import { createStudyPassage, createStudyQuestion } from "../../../fixtures";
import { renderWithUser } from "../../../helpers";

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

function vocabularySaveResponse(id = "vocab-1") {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        id,
        selectedText: "algorithmic bias",
        translation: "thiên lệch thuật toán",
        type: "noun phrase",
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
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
  Group: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: ({ className }: { className?: string }) => (
    <div className={className} />
  ),
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

function getPopupTranslateButton() {
  return screen
    .getAllByRole("button", { name: /Translate/ })
    .find((btn) => btn.closest(".fixed"))!;
}

function getSourceListItem(title: string) {
  const sourceTitle = screen
    .getAllByText(title)
    .find((element) => element.tagName === "H4");
  const sourceListItem = sourceTitle?.closest('[role="button"]');

  if (!(sourceListItem instanceof HTMLElement)) {
    throw new Error(`Source list item not found: ${title}`);
  }

  return sourceListItem;
}

describe("StudyPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("result-test-1");
    useChatState.messages = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/translate") {
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

        if (url === "/api/vocabulary") {
          return vocabularySaveResponse();
        }

        if (url.startsWith("/api/study/studio/chat")) {
          return new Response(JSON.stringify({ messages: [] }), {
            status: 200,
          });
        }

        if (url.startsWith("/api/study/studio/artifacts")) {
          return new Response(JSON.stringify({ success: true, data: { artifacts: [] } }), {
            status: 200,
          });
        }

        return new Response(JSON.stringify({ success: false }), {
          status: 404,
        });
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
    expect(
      screen.getByText("Select a document from Sources"),
    ).toBeInTheDocument();
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

    await user.click(
      screen.getByRole("button", { name: /Paste text Copied text/ }),
    );
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
    expect(
      (await screen.findAllByText("Uploaded Text")).length,
    ).toBeGreaterThan(0);
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

    await waitFor(() =>
      expect(simplifyPassage).toHaveBeenCalledWith(eligible.id),
    );
    expect(await screen.findByText("New simple version.")).toBeInTheDocument();

    unmount();
    const simple = createStudyPassage({
      id: "a2-passage",
      title: "Already Simple",
      simplifiedContent: null,
      simplifiedLevel: null,
      originalLevel: "A2",
    });
    const secondRender = renderWithUser(
      <StudyPageClient initialPassages={[simple]} />,
    );
    await secondRender.user.click(getSourceListItem("Already Simple"));

    expect(
      screen.queryByRole("button", { name: "Simplify" }),
    ).not.toBeInTheDocument();
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
    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );

    await user.click(getSourceListItem(passage.title));
    await user.click(screen.getByRole("button", { name: "Quiz" }));

    await waitFor(() =>
      expect(generateStudioQuestions).toHaveBeenCalledWith({
        passageId: passage.id,
        artifactId: expect.any(String),
      }),
    );
    expect(await screen.findByText("Results")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Quiz: The Test Passage/ }),
    );
    expect(screen.getByText(question.questionText)).toBeInTheDocument();
  });

  it("lazy-loads questions when opening a persisted quiz artifact after reload", async () => {
    // Simulates a page reload: the quiz artifact comes back from the API as
    // metadata only (no questions in memory), so opening it must lazy-load the
    // persisted questions via getArtifactDetail.
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
    vi.mocked(getArtifactDetail).mockResolvedValue({
      questions: [question],
    });

    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );

    await user.click(getSourceListItem(passage.title));

    const card = await screen.findByRole("button", {
      name: /Quiz: The Test Passage/,
    });
    await user.click(card);

    await waitFor(() =>
      expect(getArtifactDetail).toHaveBeenCalledWith(persistedArtifact.id),
    );
    expect(await screen.findByText(question.questionText)).toBeInTheDocument();
  });

  it("opens the chat view for the active passage", async () => {
    const passage = createStudyPassage();
    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );

    await user.click(getSourceListItem(passage.title));
    await user.click(screen.getByRole("button", { name: "Chat" }));
    expect(screen.getByText("Chat: The Test Passage")).toBeInTheDocument();
  });

  it("does not auto-translate on selection; requires translate icon click", async () => {
    const passage = createStudyPassage({
      content:
        "Key concerns include algorithmic bias in automated hiring systems.",
      simplifiedContent: null,
      originalLevel: "B2",
      wordCount: 8,
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "algorithmic bias",
      selectionRect: { top: 120, left: 160, width: 80, height: 20 },
      contextSentence:
        "Key concerns include algorithmic bias in automated hiring systems.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });
    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );

    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(
      screen.getByText(/Key concerns include algorithmic bias/),
    );

    // Selection captured — translate icon appears, no fetch yet
    const allTranslateBtns = await screen.findAllByRole("button", {
      name: /Translate/,
    });
    const popupTranslateBtn = allTranslateBtns.find((btn) =>
      btn.closest(".fixed"),
    );
    expect(popupTranslateBtn).toBeTruthy();
    expect(fetch).not.toHaveBeenCalledWith("/api/translate", expect.anything());
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
        message: "study-translation-selection-captured",
        data: expect.objectContaining({ selectedTextLength: 16 }),
      }),
    );

    // Click translate icon to trigger translation
    await user.click(popupTranslateBtn!);
    expect(
      await screen.findByText("thiên lệch thuật toán"),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/translate",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("does not show a quick-translation popup for oversized selections", async () => {
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
    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );

    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(longSelection));

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "study-translation",
          message: "study-translation-selection-too-long",
          data: expect.objectContaining({ selectedTextLength: 501 }),
        }),
      );
    });
    expect(screen.queryByText("Selection too long")).not.toBeInTheDocument();
    expect(
      screen
        .queryAllByRole("button", { name: /^Translate$/ })
        .find((button) => button.className.includes("fixed")),
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalledWith("/api/translate", expect.anything());
  });

  it("shows translation without Save vocabulary and opens details without second API call", async () => {
    const passage = createStudyPassage({
      content:
        "Key concerns include algorithmic bias in automated hiring systems.",
      simplifiedContent: null,
      originalLevel: "B2",
      wordCount: 8,
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "algorithmic bias",
      selectionRect: { top: 120, left: 160, width: 80, height: 20 },
      contextSentence:
        "Key concerns include algorithmic bias in automated hiring systems.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });
    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );

    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(
      screen.getByText(/Key concerns include algorithmic bias/),
    );
    await user.click(getPopupTranslateButton());

    // Popup shows translation but no Save vocabulary action
    expect(
      await screen.findByText("thiên lệch thuật toán"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Save/ }),
    ).not.toBeInTheDocument();

    // Open details shows the translate panel reusing the same translation, no second API call
    const fetchCallsBeforeDetails = vi.mocked(fetch).mock.calls.length;
    await user.click(screen.getByRole("button", { name: /Open details/ }));
    expect(
      await screen.findByText("Translate: algorithmic bias"),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(fetchCallsBeforeDetails);
  });

  it("omits null translation type when saving vocabulary from details", async () => {
    const passage = createStudyPassage({
      content: "Quorvex drift appears here.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    let vocabularyBody: Record<string, unknown> | null = null;
    vi.mocked(fetch).mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/translate") {
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

        if (url === "/api/vocabulary") {
          vocabularyBody = init?.body ? JSON.parse(String(init.body)) : null;
          return vocabularySaveResponse("vocab-fallback");
        }

        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      },
    );
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "quorvex drift",
      selectionRect: { top: 120, left: 160, width: 90, height: 20 },
      contextSentence: "Quorvex drift appears here.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });

    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );
    await user.click(getSourceListItem(passage.title));
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

  it("rejects malformed quick translation success payloads", async () => {
    const passage = createStudyPassage({
      content: "Malformed translation payload appears here.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/translate") {
        return new Response(
          JSON.stringify({ success: true, data: { translation: "missing provider", type: null } }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "Malformed translation",
      selectionRect: { top: 120, left: 160, width: 90, height: 20 },
      contextSentence: "Malformed translation payload appears here.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });

    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );
    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Malformed translation payload/));
    await user.click(getPopupTranslateButton());

    expect(await screen.findByText("Translation failed")).toBeInTheDocument();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
        level: "error",
        message: "study-translation-schema-error",
        data: { route: "/api/translate" },
      }),
    );
  });

  it("rejects malformed vocabulary save success payloads", async () => {
    const passage = createStudyPassage({
      content: "Vocabulary malformed payload appears here.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/translate") return translationResponse("tu loi");
      if (url === "/api/vocabulary") {
        return new Response(JSON.stringify({ success: true, data: { id: "vocab-bad" } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    });
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "Vocabulary malformed",
      selectionRect: { top: 120, left: 160, width: 90, height: 20 },
      contextSentence: "Vocabulary malformed payload appears here.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });

    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );
    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Vocabulary malformed payload/));
    await user.click(getPopupTranslateButton());
    await user.click(screen.getByRole("button", { name: /Open details/ }));
    await user.click(await screen.findByRole("button", { name: /Save/ }));

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "study-vocabulary",
          level: "error",
          message: "study-vocabulary-schema-error",
          data: { route: "/api/vocabulary" },
        }),
      );
    });
    expect(screen.getByRole("button", { name: /Save/ })).toBeEnabled();
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
    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );

    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(
      screen.getByText(/Simple text contains algorithmic bias/),
    );
    await user.click(getPopupTranslateButton());
    expect(
      await screen.findByText("thiên lệch thuật toán"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Original (B2)" }));
    expect(screen.queryByText("thiên lệch thuật toán")).not.toBeInTheDocument();

    fireEvent.contextMenu(
      screen.getByText(/Original text contains algorithmic bias/),
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("ignores stale quick translation responses after rapid reselection", async () => {
    const passage = createStudyPassage({
      content: "First term appears here.\n\nSecond term appears here.",
      simplifiedContent: null,
      originalLevel: "B2",
    });
    const first = deferredResponse();
    vi.mocked(fetch).mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        if (url === "/api/translate" && body?.text === "first term")
          return first.promise;
        if (url === "/api/translate" && body?.text === "second term") {
          return translationResponse("ban dich thu hai");
        }
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      },
    );
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

    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );
    await user.click(getSourceListItem(passage.title));

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
        return new Response(JSON.stringify({ error: "Unable to translate." }), {
          status: 500,
        });
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

    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );
    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Unknown phrase appears here/));
    await user.click(getPopupTranslateButton());

    expect(await screen.findByText("Translation failed")).toBeInTheDocument();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
        level: "error",
        message: "study-translation-error",
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
    vi.mocked(fetch).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/translate") {
          quickRequestCount++;
          return deferred.promise;
        }
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      },
    );
    vi.mocked(extractSelectionInfo).mockReturnValue({
      selectedText: "Rapid click",
      selectionRect: { top: 120, left: 160, width: 80, height: 20 },
      contextSentence: "Rapid click test content.",
      sourceId: passage.id,
      targetLanguage: "vi",
    });

    const { user } = renderWithUser(
      <StudyPageClient initialPassages={[passage]} />,
    );
    await user.click(getSourceListItem(passage.title));
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
