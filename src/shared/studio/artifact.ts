import { z } from "zod";
import { ProcessingStatus, StudioArtifactType } from "@/shared/enums";
import {
  Difficulty,
  QuestionFormat,
  flashcardGenerationOptionsSchema,
  questionGenerationOptionsSchema,
} from "./generation-options";

// ─── Question Content ──────────────────────────────────────────────

// Every format is answered by picking an option, so grading and progress stay
// numeric: multiple choice has 4 options, True/False/Not Given has 3, and
// fill-in-the-blank offers 4 words for the "____" in the text.
const questionItemSchema = z
  .object({
    format: z.enum(QuestionFormat).default(QuestionFormat.MULTIPLE_CHOICE),
    text: z.string(),
    options: z.array(z.string()).min(2).max(4),
    correctIndex: z.number().int().min(0),
    sourceText: z.string(),
    explanation: z.string(),
  })
  .refine((q) => q.correctIndex < q.options.length, { message: "correctIndex out of range", path: ["correctIndex"] });

export type QuestionItem = z.infer<typeof questionItemSchema>;

export const questionContentSchema = z.object({
  questions: z.array(questionItemSchema).min(1).max(15),
  /** The options the set was generated with; absent on sets made before options existed. */
  settings: questionGenerationOptionsSchema.nullish(),
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
  /** An example sentence, when the deck was generated with examples. */
  example: z.string().nullish(),
});

export const flashcardContentSchema = z.object({
  cards: z.array(flashcardItemSchema).min(1).max(20),
  /** The options the deck was generated with; absent on decks made before options existed. */
  settings: flashcardGenerationOptionsSchema.nullish(),
});

export type FlashcardContent = z.infer<typeof flashcardContentSchema>;

// Queue-based progress: `queue` holds indices of cards still to review,
// `missCounts[i]` counts how many times card i was marked "not yet".
// Defaults keep rows saved before these fields existed readable.
export const flashcardProgressSchema = z.object({
  queue: z.array(z.number().int().min(0)).default([0, 1, 2, 3, 4]),
  missCounts: z.array(z.number().int().nonnegative()).default([]),
  isCompleted: z.boolean().default(false),
});

export type FlashcardProgress = z.infer<typeof flashcardProgressSchema>;

// ─── Common Fields ─────────────────────────────────────────────────

const artifactCommon = {
  id: z.string(),
  passageId: z.string(),
  createdAt: z.coerce.date(),
  status: z.enum(ProcessingStatus),
} as const;

/** Read out of the content for the list, which does not carry the content itself. */
const listSummary = {
  /** Questions or cards in the set; null until generated. */
  itemCount: z.number().int().nullable().default(null),
  /** Null until generated, and on sets made before options existed. */
  difficulty: z.enum(Difficulty).nullable().default(null),
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
  questionListItemVariant.extend(artifactCommon).extend(listSummary),
  flashcardListItemVariant.extend(artifactCommon).extend(listSummary),
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
