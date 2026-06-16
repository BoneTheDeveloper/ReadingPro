export type StudioArtifactType = "quiz" | "flashcard";
export type StudioArtifactStatus = "generating" | "done" | "failed";

// Stable, structured reason a generation failed. In-memory only; not persisted —
// the atomic generation either commits entirely or rolls back, so a failure leaves
// no DB row. Shared by the API error envelope ({ error, code }) and the UI:
// the user sees a localized message for the code, developers see the code + Sentry.
// Keep in sync with the i18n keys and the message resolver in the studio panel.
export type StudioArtifactErrorCode =
  | "GENERATION_FAILED" // upstream produced nothing usable (500 fallback)
  | "NO_QUESTIONS" // model returned zero questions
  | "VALIDATION_FAILED" // every generated question failed validation
  | "UPSTREAM_ERROR" // study service rejected the request (502)
  | "TIMEOUT" // client/backend timed out
  | "UNKNOWN"; // unmapped error

// Budget for a single quiz generation. Used by the client AbortController and the
// backend LLM-call race so a hung upstream cannot hold an invocation open.
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
