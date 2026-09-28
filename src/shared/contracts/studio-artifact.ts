import { z } from "zod";
import { ProcessingStatus, StudioArtifactType } from "@/generated/prisma/enums";

// ─── Question Content ──────────────────────────────────────────────

const QUESTION_OPTIONS_COUNT = 4 as const;

const questionItemSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).length(QUESTION_OPTIONS_COUNT),
  correctIndex: z.number().int().min(0).max(QUESTION_OPTIONS_COUNT - 1),
  sourceText: z.string(),
  explanation: z.string(),
});

export const questionContentSchema = z.object({
  questions: z.array(questionItemSchema).min(1),
});

export type QuestionContent = z.infer<typeof questionContentSchema>;

export const questionProgressSchema = z.object({
  currentIndex: z.number().int().nonnegative(),
  answers: z.array(z.number().int().nullable()),
  correctCount: z.number().int().nonnegative(),
  isCompleted: z.boolean(),
});

export type QuestionProgress = z.infer<typeof questionProgressSchema>;

// ─── Flashcard Content ─────────────────────────────────────────────

const flashcardItemSchema = z.object({
  front: z.string(),
  back: z.string(),
});

export const flashcardContentSchema = z.object({
  cards: z.array(flashcardItemSchema).length(5),
});

export type FlashcardContent = z.infer<typeof flashcardContentSchema>;

// Queue-based progress: store indices of cards needing review
export const flashcardProgressSchema = z.object({
  queue: z.array(z.number().int().min(0)).default([0, 1, 2, 3, 4]),
});

export type FlashcardProgress = z.infer<typeof flashcardProgressSchema>;

// ─── Common Fields ─────────────────────────────────────────────────

const artifactCommon = {
  id: z.string(),
  passageId: z.string(),
  createdAt: z.coerce.date(),
  status: z.enum(ProcessingStatus),
} as const;

// ─── List Item Schemas (no content) ───────────────────────────────

const questionListItemVariant = z.object({
  type: z.literal(StudioArtifactType.QUESTION),
  progress: questionProgressSchema.nullable(),
});

const flashcardListItemVariant = z.object({
  type: z.literal(StudioArtifactType.FLASHCARD),
  progress: flashcardProgressSchema.nullable(),
});

export const studioArtifactListItemSchema = z.discriminatedUnion("type", [
  questionListItemVariant.extend(artifactCommon),
  flashcardListItemVariant.extend(artifactCommon),
]);

export type StudioArtifactListItem = z.infer<typeof studioArtifactListItemSchema>;

// ─── Detail Schemas (with content) ────────────────────────────────

const questionDetailVariant = z.object({
  type: z.literal(StudioArtifactType.QUESTION),
  progress: questionProgressSchema.nullable(),
  content: questionContentSchema,
});

const flashcardDetailVariant = z.object({
  type: z.literal(StudioArtifactType.FLASHCARD),
  progress: flashcardProgressSchema.nullable(),
  content: flashcardContentSchema,
});

export const studioArtifactSchema = z.discriminatedUnion("type", [
  questionDetailVariant.extend(artifactCommon),
  flashcardDetailVariant.extend(artifactCommon),
]);

export type StudioArtifact = z.infer<typeof studioArtifactSchema>;
