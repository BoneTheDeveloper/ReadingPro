import { z } from "zod";
import type { GeneratedQuestionDto } from "./question";



export type StudioGridId =
  | "question"
  | "flashcard"
  | "summary"
  | "chat"


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

export type StudioArtifactType = "question" | "flashcard";
export type StudioArtifactStatus = "generating" | "done" | "failed";

interface QuestionResult {
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
  questionResult?: QuestionResult;
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


export interface ArtifactRef {
  type: StudioArtifactType;
  id: string;
}


export type StudioPanelView =
  | { mode: "artifact"; ref: ArtifactRef }
  | { mode: "chat" }
  | null;

export interface ArtifactDetailCacheEntry {
  questions?: GeneratedQuestionDto[];
}
