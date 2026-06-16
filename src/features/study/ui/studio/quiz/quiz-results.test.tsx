import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { studioRecordQuizResultAction } from "@/features/study/actions/studio-artifact-actions";
import { QuizResults } from "./quiz-results";

vi.mock("@/features/study/actions/studio-artifact-actions", () => ({
  studioRecordQuizResultAction: vi.fn(),
  studioResetQuizResultAction: vi.fn(),
}));

function renderResults(overrides: Partial<Parameters<typeof QuizResults>[0]> = {}) {
  return render(
    <QuizResults
      correctCount={3}
      totalQuestions={5}
      passageTitle="Sample"
      artifactId="artifact-1"
      onReset={vi.fn()}
      onNewPassage={vi.fn()}
      onRecordResult={vi.fn()}
      onResetResult={vi.fn()}
      {...overrides}
    />,
  );
}

describe("QuizResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records the result once on mount when an artifactId is present", async () => {
    vi.mocked(studioRecordQuizResultAction).mockResolvedValue({ ok: true });
    const onRecordResult = vi.fn();
    renderResults({ onRecordResult });

    await waitFor(() => expect(studioRecordQuizResultAction).toHaveBeenCalledTimes(1));
    expect(studioRecordQuizResultAction).toHaveBeenCalledWith({
      artifactId: "artifact-1",
      correctCount: 3,
      totalQuestions: 5,
    });
    await waitFor(() => expect(onRecordResult).toHaveBeenCalledWith({ correctCount: 3, totalQuestions: 5 }));
  });

  it("keeps the score visible and shows a recoverable banner when saving fails", async () => {
    vi.mocked(studioRecordQuizResultAction).mockResolvedValue({ error: "save failed" });
    renderResults();

    // Banner + retry affordance.
    expect(await screen.findByText("Failed to save progress")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/ })).toBeInTheDocument();
    // Score card remains visible (graceful degradation).
    expect(screen.getByText("Test complete")).toBeInTheDocument();
  });

  it("does not attempt to save when there is no artifactId", async () => {
    renderResults({ artifactId: null });
    await waitFor(() => expect(studioRecordQuizResultAction).not.toHaveBeenCalled());
  });
});
