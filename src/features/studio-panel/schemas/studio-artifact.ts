import { z } from "zod";
import type { GeneratedQuestionDto } from "./question";

// ---------------------------------------------------------------------------
// Server-action input schema — validated in studio-panel/actions.ts
// ---------------------------------------------------------------------------

export const recordQuizResultInputSchema = z
  .object({
    correctCount: z.number().int().nonnegative(),
    totalQuestions: z.number().int().positive(),
  })
  .refine((data) => data.correctCount <= data.totalQuestions, {
    message: "correctCount cannot exceed totalQuestions",
    path: ["correctCount"],
  });

// ---------------------------------------------------------------------------
// Types - shared across studio-panel feature
// ---------------------------------------------------------------------------

export type StudioArtifactType = "quiz" | "flashcard";
export type StudioArtifactStatus = "generating" | "done" | "failed";

interface QuizResult {
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
  | "PASSAGE_NOT_FOUND"
  | "UNKNOWN";

/**
 * Reference to a real, persisted studio artifact.
 * Chat uses its own mode in `StudioPanelView` — it is NOT an artifact.
 */
export interface ArtifactRef {
  type: StudioArtifactType;
  id: string;
}

/**
 * What the studio panel is currently displaying. Chat is a first-class mode,
 * not a fake artifact — it does not appear in `ArtifactRef.type`.
 *
 * Add new modes here when introducing new panel content (history, settings, etc.).
 */
export type StudioPanelView =
  | { mode: "artifact"; ref: ArtifactRef }
  | { mode: "chat" }
  | null;

export interface ArtifactDetailCacheEntry {
  questions?: GeneratedQuestionDto[];
}
