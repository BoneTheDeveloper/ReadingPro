import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import {
  studioCreateArtifactAction,
  studioCompleteArtifactAction,
  studioDeleteArtifactAction,
} from "@/features/study/actions/studio-artifact-actions";
import { generateStudioQuestions } from "@/features/study/api/studio-questions-client";
import type { PassageData, QuestionData, StudyState } from "../model/types";
import { useStudyActions } from "./use-study-actions";

vi.mock("@/features/study/api/studio-questions-client", () => ({
  generateStudioQuestions: vi.fn(),
}));

vi.mock("@/features/study/actions/study-simplify-action", () => ({
  studySimplifyAction: vi.fn(),
}));

vi.mock("@/features/study/actions/studio-artifact-actions", () => ({
  studioCreateArtifactAction: vi.fn(),
  studioCompleteArtifactAction: vi.fn(),
  studioDeleteArtifactAction: vi.fn(),
  studioLoadArtifactDetailAction: vi.fn(),
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
    artifactsByPassageId: {},
    viewingArtifactByPassageId: {},
    artifactDetailById: {},
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
    vi.mocked(studioCreateArtifactAction).mockResolvedValue({
      id: "result-1",
      type: "quiz",
      passageId: "passage-1",
      title: "Study Passage",
      status: "generating",
      createdAt: new Date().toISOString(),
    });
    vi.mocked(studioCompleteArtifactAction).mockResolvedValue({ ok: true });
    vi.mocked(studioDeleteArtifactAction).mockResolvedValue({ ok: true });
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
    vi.mocked(generateStudioQuestions).mockResolvedValue({ questions: [question] });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });

    expect(generateStudioQuestions).toHaveBeenCalledWith({ passageId: "passage-1", artifactId: "result-1" });
    const quizResults = result.current.state.artifactsByPassageId["passage-1"].data;
    expect(quizResults).toHaveLength(1);
    expect(quizResults[0]).toMatchObject({
      id: "result-1",
      type: "quiz",
      passageId: "passage-1",
      title: "Study Passage",
      status: "done",
    });
    expect(quizResults[0].updatedAt).toEqual(expect.any(String));
    expect(result.current.state.artifactDetailById["result-1"].questions).toEqual([question]);
  });

  it("marks the quiz failed with the server error code and deletes the abandoned row", async () => {
    vi.mocked(generateStudioQuestions).mockResolvedValueOnce({ error: "No questions generated", code: "NO_QUESTIONS" });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });

    expect(result.current.state.error).toBe("No questions generated");
    const results = result.current.state.artifactsByPassageId["passage-1"].data;
    expect(results[0]).toMatchObject({ status: "failed", errorCode: "NO_QUESTIONS" });
    expect(studioDeleteArtifactAction).toHaveBeenCalledWith({ artifactId: "result-1" });
  });

  it("settles a stalled generation to failed (TIMEOUT) so the lock releases", async () => {
    vi.mocked(generateStudioQuestions).mockResolvedValueOnce({ error: "Request timed out", code: "TIMEOUT" });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });

    const results = result.current.state.artifactsByPassageId["passage-1"].data;
    expect(results[0]).toMatchObject({ status: "failed", errorCode: "TIMEOUT" });
    // No artifact is left in "generating", so the studio action lock is freed.
    expect(results.some((r) => r.status === "generating")).toBe(false);
  });

  it("keeps a successful generation on its originating passage after a passage switch", async () => {
    let resolveQuestions: (value: { questions: QuestionData[] }) => void = () => {};
    vi.mocked(generateStudioQuestions).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuestions = resolve;
        }),
    );

    const { result, rerender } = renderStudyActions();

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

    // The valid quiz is preserved (status "done") on passage-1, not discarded.
    const originating = result.current.state.artifactsByPassageId["passage-1"].data;
    expect(originating[0]).toMatchObject({ passageId: "passage-1", status: "done" });
    expect(result.current.state.artifactDetailById["result-1"].questions).toEqual([question]);
    expect(studioDeleteArtifactAction).not.toHaveBeenCalled();
  });

  it("retries a failed quiz by recreating the row under the same id and regenerating", async () => {
    vi.mocked(generateStudioQuestions).mockResolvedValueOnce({ error: "Request timed out", code: "TIMEOUT" });
    const { result } = renderStudyActions();

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });
    expect(result.current.state.artifactsByPassageId["passage-1"].data[0]).toMatchObject({ status: "failed" });

    vi.mocked(generateStudioQuestions).mockResolvedValueOnce({ questions: [question] });

    await act(async () => {
      await result.current.actions.retryQuizArtifact("result-1");
    });

    expect(studioCreateArtifactAction).toHaveBeenLastCalledWith({
      id: "result-1",
      passageId: "passage-1",
      type: "quiz",
      title: "Study Passage",
    });
    const retried = result.current.state.artifactsByPassageId["passage-1"].data;
    expect(retried).toHaveLength(1);
    expect(retried[0]).toMatchObject({ id: "result-1", status: "done", errorCode: undefined });
  });

  it("ignores action clicks when active passage state is missing or stale", async () => {
    const { result } = renderStudyActions(createState({ activePassageId: "missing-passage" }));

    await act(async () => {
      await result.current.actions.handleActionClick("quiz");
    });

    expect(generateStudioQuestions).not.toHaveBeenCalled();
    expect(result.current.state.artifactsByPassageId).toEqual({});
  });
});
