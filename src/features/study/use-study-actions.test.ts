import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import { generateStudyQuestions } from "@/features/study/study-api";
import type { PassageData, QuestionData, StudyState } from "./study-types";
import { useStudyActions } from "./use-study-actions";

vi.mock("@/features/study/study-api", () => ({
  generateStudyQuestions: vi.fn(),
}));

vi.mock("@/features/study/actions/study-simplify-action", () => ({
  studySimplifyAction: vi.fn(),
}));

const passage: PassageData = {
  id: "passage-1",
  title: "Study Passage",
  content: "A detailed source passage.",
  simplifiedContent: "Existing summary",
  originalLevel: "C1",
  simplifiedLevel: "B1",
  wordCount: 180,
  createdAt: Date.UTC(2026, 4, 1),
  sourceType: "TEXT",
};

const otherPassage: PassageData = {
  ...passage,
  id: "passage-2",
  title: "Other Passage",
};

const question: QuestionData = {
  id: "question-1",
  number: 1,
  questionText: "What is the passage about?",
  options: [{ id: "a", text: "Reading" }],
  correctAnswer: "a",
  explanation: "The passage discusses reading.",
  sourceText: "A detailed source passage.",
  sourceLine: 1,
  questionType: "main_idea",
  difficulty: 1,
};

function createState(overrides: Partial<StudyState> = {}): StudyState {
  return {
    passages: [passage, otherPassage],
    activePassageId: "passage-1",
    status: "ready",
    error: null,
    simplifying: false,
    uploadModalOpen: false,
    resultsByPassageId: {},
    viewingResultByPassageId: {},
    resultDetailById: {},
    ...overrides,
  };
}

function renderStudyActions(initialState: StudyState = createState()) {
  return renderHook(() => {
    const [state, setState] = useState(initialState);
    return {
      state,
      setState,
      actions: useStudyActions({
        state,
        setState,
      }),
    };
  });
}

describe("useStudyActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("result-1");
  });

  it("simplifies the active passage and clears the loading state", async () => {
    vi.mocked(studySimplifyAction).mockResolvedValue({
      simplifiedContent: "Fresh summary",
      simplifiedLevel: "B2",
    });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleSimplify();
    });

    expect(studySimplifyAction).toHaveBeenCalledWith({ passageId: "passage-1" });
    expect(result.current.state.simplifying).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.passages[0]).toMatchObject({
      simplifiedContent: "Fresh summary",
      simplifiedLevel: "B2",
    });
  });

  it("does nothing when simplifying without an active passage", async () => {
    const { result } = renderStudyActions(createState({ activePassageId: null }));

    await act(async () => {
      await result.current.actions.handleSimplify();
    });

    expect(studySimplifyAction).not.toHaveBeenCalled();
    expect(result.current.state.simplifying).toBe(false);
  });

  it("stores server and translated fallback errors from simplification", async () => {
    vi.mocked(studySimplifyAction).mockResolvedValueOnce({ error: "Server says no" });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleSimplify();
    });

    expect(result.current.state).toMatchObject({
      simplifying: false,
      error: "Server says no",
    });

    vi.mocked(studySimplifyAction).mockRejectedValueOnce("boom");

    await act(async () => {
      await result.current.actions.handleSimplify();
    });

    expect(result.current.state).toMatchObject({
      simplifying: false,
      error: "Simplification failed",
    });
  });

  it("inserts a completed quiz result and writes generated questions", async () => {
    vi.mocked(generateStudyQuestions).mockResolvedValue({ questions: [question] });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });

    expect(generateStudyQuestions).toHaveBeenCalledWith({ passageId: "passage-1" });
    const quizResults = result.current.state.resultsByPassageId["passage-1"].data;
    expect(quizResults).toHaveLength(1);
    expect(quizResults[0]).toMatchObject({
      id: "result-1",
      type: "quiz",
      passageId: "passage-1",
      title: "Study Passage",
      status: "completed",
    });
    expect(quizResults[0].updatedAt).toEqual(expect.any(String));
    expect(result.current.state.resultDetailById["result-1"].questions).toEqual([question]);
  });

  it("inserts a completed summary result and updates the active passage", async () => {
    vi.mocked(studySimplifyAction).mockResolvedValue({
      simplifiedContent: "Generated summary",
      simplifiedLevel: "A2",
    });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("summary");
    });

    expect(studySimplifyAction).toHaveBeenCalledWith({ passageId: "passage-1" });
    expect(result.current.state.simplifying).toBe(false);
    expect(result.current.state.passages[0]).toMatchObject({
      simplifiedContent: "Generated summary",
      simplifiedLevel: "A2",
    });
    const summaryResults = result.current.state.resultsByPassageId["passage-1"].data;
    expect(summaryResults).toHaveLength(1);
    expect(summaryResults[0]).toMatchObject({
      id: "result-1",
      type: "summary",
      status: "completed",
    });
    expect(result.current.state.resultDetailById["result-1"]).toMatchObject({
      simplifiedContent: "Generated summary",
      simplifiedLevel: "A2",
    });
  });

  it("uses existing summary data when the summary action is skipped", async () => {
    vi.mocked(studySimplifyAction).mockResolvedValue({ skipped: true, reason: "Already simplified" });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("summary");
    });

    expect(result.current.state.passages[0].simplifiedContent).toBe("Existing summary");
    const summaryResults = result.current.state.resultsByPassageId["passage-1"].data;
    expect(summaryResults).toHaveLength(1);
    expect(summaryResults[0]).toMatchObject({
      id: "result-1",
      status: "completed",
    });
    expect(result.current.state.resultDetailById["result-1"]).toMatchObject({
      simplifiedContent: "Existing summary",
      simplifiedLevel: "B1",
    });
  });

  it("marks quiz artifacts as errors for server failures and stale active passage refs", async () => {
    vi.mocked(generateStudyQuestions).mockResolvedValueOnce({ error: "Generation failed" });
    const { result, rerender } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });

    expect(result.current.state.error).toBe("Generation failed");
    const firstResults = result.current.state.resultsByPassageId["passage-1"].data;
    expect(firstResults[0]).toMatchObject({ status: "error" });

    let resolveQuestions: (value: { questions: QuestionData[] }) => void = () => {};
    vi.mocked(generateStudyQuestions).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuestions = resolve;
        }),
    );

    let actionPromise: Promise<void>;
    act(() => {
      actionPromise = result.current.actions.handleActionClick("quiz");
    });

    await act(async () => {
      result.current.setState((prev) => ({ ...prev, activePassageId: "passage-2" }));
      rerender();
    });

    await act(async () => {
      resolveQuestions({ questions: [question] });
      await actionPromise;
    });

    const secondResults = result.current.state.resultsByPassageId["passage-1"].data;
    expect(secondResults).toHaveLength(2);
    expect(secondResults[0]).toMatchObject({
      passageId: "passage-1",
      status: "error",
    });
  });

  it("ignores action clicks when active passage state is missing or stale", async () => {
    const { result } = renderStudyActions(createState({ activePassageId: "missing-passage" }));

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });

    expect(generateStudyQuestions).not.toHaveBeenCalled();
    expect(result.current.state.resultsByPassageId).toEqual({});
  });
});
