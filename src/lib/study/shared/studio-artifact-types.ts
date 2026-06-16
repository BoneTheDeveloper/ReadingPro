export type StudioArtifactType = "quiz" | "flashcard";
export type StudioArtifactStatus = "generating" | "done" | "failed";

// Stable, structured reason a generation failed. Kept in CLIENT STATE ONLY — never
// persisted to the DB: failures are ephemeral (the artifact row is deleted), so the
// reason is gone after reload by design. Shared by the API error envelope
// ({ error, code }) and the UI so both read the same vocabulary: the user sees a
// localized message for the code, developers read the code (+ errorDetail + Sentry).
// Keep in sync with the i18n keys and the message resolver in the studio panel.
export type StudioArtifactErrorCode =
  | "GENERATION_FAILED" // upstream produced nothing usable (500 fallback)
  | "NO_QUESTIONS" // model returned zero questions
  | "VALIDATION_FAILED" // every generated question failed validation
  | "UPSTREAM_ERROR" // study service rejected the request (502)
  | "TIMEOUT" // client/backend timed out, or orphan reaper reaped it
  | "UNKNOWN"; // unmapped error

// Budget for a single quiz generation. Used by both the client AbortController
// (primary fix: always settles the promise so the action lock is released) and
// the backend LLM-call race (so a hung upstream cannot hold an invocation open).
// Set at or above worst-case generation time; the 5-min orphan reaper is the
// backstop. Single tunable constant.
export const STUDIO_GENERATION_TIMEOUT_MS = 45_000;

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
  // Populated only when status is "failed": structured reason + raw detail.
  errorCode?: StudioArtifactErrorCode;
  errorDetail?: string;
}

export const ARTIFACT_STALE_TIME = 60_000;

// A "generating" row only ever transitions to done/failed from the client that
// started it. If that client dies mid-flight (tab/app closed, crash, nav-away),
// the row would be stuck "generating" forever and permanently lock the action.
// Any generating row older than this is treated as orphaned and reconciled to
// "failed" on read. Set well beyond worst-case generation time so an in-flight
// job is never falsely reaped.
export const GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS = 5 * 60_000;
