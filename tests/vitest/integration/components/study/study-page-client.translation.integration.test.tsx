import { fireEvent, screen, waitFor } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudyPageClient } from "@/features/study/ui/study-workspace-client";
import { extractSelectionInfo } from "@/features/study/model/selection-utils";
import { createStudyPassage } from "../../../fixtures";
import { renderWithUser } from "../../../helpers";
import {
  defaultFetchHandler,
  deferredResponse,
  getPopupTranslateButton,
  getSourceListItem,
  translationResponse,
  vocabularySaveResponse,
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

describe("StudyPageClient — translation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatState.messages = [];
    vi.stubGlobal("fetch", defaultFetchHandler());
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

    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Key concerns include algorithmic bias/));

    const allTranslateBtns = await screen.findAllByRole("button", { name: /Translate/ });
    const popupTranslateBtn = allTranslateBtns.find((btn) => btn.closest(".fixed"));
    expect(popupTranslateBtn).toBeTruthy();
    expect(fetch).not.toHaveBeenCalledWith("/api/translate", expect.anything());
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
        message: "study-translation-selection-captured",
      }),
    );

    await user.click(popupTranslateBtn!);
    expect(await screen.findByText("thiên lệch thuật toán")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/translate", expect.objectContaining({ method: "POST" }));
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
    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);

    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(longSelection));

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "study-translation",
          message: "study-translation-selection-too-long",
        }),
      );
    });
    expect(fetch).not.toHaveBeenCalledWith("/api/translate", expect.anything());
  });

  it("shows translation without Save vocabulary and reuses the result on details", async () => {
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

    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Key concerns include algorithmic bias/));
    await user.click(getPopupTranslateButton());

    expect(await screen.findByText("thiên lệch thuật toán")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save/ })).not.toBeInTheDocument();

    const fetchCallsBeforeDetails = vi.mocked(fetch).mock.calls.length;
    await user.click(screen.getByRole("button", { name: /Open details/ }));
    expect(await screen.findByText("Lookup: algorithmic bias")).toBeInTheDocument();
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
              data: { translation: "quorvex sự trôi", type: null, provider: "fallback" },
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

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
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
          JSON.stringify({
            success: true,
            data: { translation: "missing provider", type: null },
          }),
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

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Malformed translation payload/));
    await user.click(getPopupTranslateButton());

    expect(await screen.findByText("Translation failed")).toBeInTheDocument();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
        message: "study-translation-schema-error",
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

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Vocabulary malformed payload/));
    await user.click(getPopupTranslateButton());
    await user.click(screen.getByRole("button", { name: /Open details/ }));
    await user.click(await screen.findByRole("button", { name: /Save/ }));

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "study-vocabulary",
          message: "study-vocabulary-schema-error",
        }),
      );
    });
    expect(screen.getByRole("button", { name: /Save/ })).toBeEnabled();
  });

  it("clears stale translation selection on mode change and skips custom context menu", async () => {
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

    await user.click(getSourceListItem(passage.title));
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
    vi.mocked(fetch).mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        if (url === "/api/translate" && body?.text === "first term") return first.promise;
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

    const { user } = renderWithUser(<StudyPageClient initialPassages={[passage]} />);
    await user.click(getSourceListItem(passage.title));

    fireEvent.mouseUp(screen.getByText(/First term appears here/));
    await user.click(getPopupTranslateButton());

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
    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Unknown phrase appears here/));
    await user.click(getPopupTranslateButton());

    expect(await screen.findByText("Translation failed")).toBeInTheDocument();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "study-translation",
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
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/translate") {
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
    await user.click(getSourceListItem(passage.title));
    fireEvent.mouseUp(screen.getByText(/Rapid click test content/));

    const translateBtn = getPopupTranslateButton();
    await user.click(translateBtn);
    await user.click(translateBtn);
    await user.click(translateBtn);

    expect(quickRequestCount).toBe(1);

    deferred.resolve(translationResponse("click nhanh"));
    expect(await screen.findByText("click nhanh")).toBeInTheDocument();
  });
});
