export type StudioArtifactType = "quiz" | "flashcard";
export type StudioArtifactStatus = "generating" | "done" | "failed";

export interface QuizResult {
  completedAt: string;
  correctCount: number;
  totalQuestions: number;
  accuracyRate: number;
}

export interface StudioArtifact {
  id: string;
  type: StudioArtifactType;
  passageId: string;
  title: string;
  status: StudioArtifactStatus;
  createdAt: string;
  updatedAt?: string;
  quizResult?: QuizResult;
}

export const ARTIFACT_STALE_TIME = 60_000;

// A "generating" row only ever transitions to done/failed from the client that
// started it. If that client dies mid-flight (tab/app closed, crash, nav-away),
// the row would be stuck "generating" forever and permanently lock the action.
// Any generating row older than this is treated as orphaned and reconciled to
// "failed" on read. Set well beyond worst-case generation time so an in-flight
// job is never falsely reaped.
export const GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS = 5 * 60_000;
