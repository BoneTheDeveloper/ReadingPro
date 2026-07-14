// Single source of truth: studio artifact types
// Used by studio-panel feature and app-level hooks

export type StudioArtifactType = "quiz" | "flashcard";
export type StudioArtifactStatus = "generating" | "done" | "failed";
export type ArtifactsCacheStatus = "idle" | "loading" | "success" | "error";

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
  errorCode?: StudioArtifactErrorCode;
  errorDetail?: string;
}

export type StudioArtifactErrorCode =
  | "GENERATION_FAILED"
  | "NO_QUESTIONS"
  | "VALIDATION_FAILED"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export interface GeneratedStudyQuestionDto {
  id: string;
  number: number;
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  sourceText?: string;
  sourceLine?: number;
  questionType: string;
  difficulty: number;
}

export interface ArtifactsCacheEntry {
  status: ArtifactsCacheStatus;
  data: StudioArtifact[];
  fetchedAt?: number;
  error?: string;
}

export interface ArtifactRef {
  type: StudioArtifactType;
  id: string;
}

export interface ArtifactDetailCacheEntry {
  questions?: GeneratedStudyQuestionDto[];
}

export const ARTIFACT_STALE_TIME = 60_000;

// Budget for a single quiz generation
export const STUDIO_GENERATION_TIMEOUT_MS = 45_000;
