import { z } from "zod";

/**
 * What the user can tune when generating study material. Each value maps to a
 * prompt instruction on the server; the labels are what the UI shows.
 * Every field has a default so an empty object reproduces the original behaviour.
 */

export const Difficulty = { EASY: "EASY", MEDIUM: "MEDIUM", HARD: "HARD" } as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Dễ", MEDIUM: "Vừa", HARD: "Khó" };

// ─── Questions ─────────────────────────────────────────────────────

export const QuestionFormat = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE_NOT_GIVEN: "TRUE_FALSE_NOT_GIVEN",
  FILL_BLANK: "FILL_BLANK",
} as const;
export type QuestionFormat = (typeof QuestionFormat)[keyof typeof QuestionFormat];
export const QUESTION_FORMAT_LABEL: Record<QuestionFormat, string> = {
  MULTIPLE_CHOICE: "Trắc nghiệm",
  TRUE_FALSE_NOT_GIVEN: "Đúng / Sai / Không có",
  FILL_BLANK: "Điền từ",
};

export const QuestionFocus = {
  MAIN_IDEA: "MAIN_IDEA",
  DETAIL: "DETAIL",
  INFERENCE: "INFERENCE",
  VOCABULARY: "VOCABULARY",
} as const;
export type QuestionFocus = (typeof QuestionFocus)[keyof typeof QuestionFocus];
export const QUESTION_FOCUS_LABEL: Record<QuestionFocus, string> = {
  MAIN_IDEA: "Ý chính",
  DETAIL: "Chi tiết",
  INFERENCE: "Suy luận",
  VOCABULARY: "Từ vựng trong ngữ cảnh",
};

export const ExplanationLanguage = { VI: "VI", EN: "EN" } as const;
export type ExplanationLanguage = (typeof ExplanationLanguage)[keyof typeof ExplanationLanguage];
export const EXPLANATION_LANGUAGE_LABEL: Record<ExplanationLanguage, string> = { VI: "Tiếng Việt", EN: "Tiếng Anh" };

export const QUESTION_COUNTS = [3, 5, 10, 15] as const;

export const questionGenerationOptionsSchema = z.object({
  count: z.number().int().min(1).max(15).default(5),
  difficulty: z.enum(Difficulty).default(Difficulty.MEDIUM),
  formats: z.array(z.enum(QuestionFormat)).min(1).default([QuestionFormat.MULTIPLE_CHOICE]),
  focus: z.array(z.enum(QuestionFocus)).default([]),
  explanationLanguage: z.enum(ExplanationLanguage).default(ExplanationLanguage.EN),
});
export type QuestionGenerationOptions = z.infer<typeof questionGenerationOptionsSchema>;

// ─── Flashcards ────────────────────────────────────────────────────

export const FlashcardContentType = {
  VOCABULARY: "VOCABULARY",
  PHRASE: "PHRASE",
  CONCEPT: "CONCEPT",
} as const;
export type FlashcardContentType = (typeof FlashcardContentType)[keyof typeof FlashcardContentType];
export const FLASHCARD_CONTENT_LABEL: Record<FlashcardContentType, string> = {
  VOCABULARY: "Từ vựng",
  PHRASE: "Cụm từ",
  CONCEPT: "Ý chính / khái niệm",
};

export const FlashcardBack = { VI_MEANING: "VI_MEANING", EN_DEFINITION: "EN_DEFINITION" } as const;
export type FlashcardBack = (typeof FlashcardBack)[keyof typeof FlashcardBack];
export const FLASHCARD_BACK_LABEL: Record<FlashcardBack, string> = {
  VI_MEANING: "Tiếng Việt",
  EN_DEFINITION: "Tiếng Anh",
};

export const FLASHCARD_COUNTS = [5, 10, 15, 20] as const;

export const flashcardGenerationOptionsSchema = z.object({
  count: z.number().int().min(1).max(20).default(5),
  contentType: z.enum(FlashcardContentType).default(FlashcardContentType.VOCABULARY),
  difficulty: z.enum(Difficulty).default(Difficulty.MEDIUM),
  back: z.enum(FlashcardBack).default(FlashcardBack.VI_MEANING),
  withExample: z.boolean().default(false),
});
export type FlashcardGenerationOptions = z.infer<typeof flashcardGenerationOptionsSchema>;
