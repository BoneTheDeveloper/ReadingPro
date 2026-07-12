import { z } from "zod";

// ---------------------------------------------------------------------------
// Server-action input schema — validated in studio-panel/actions.ts
// ---------------------------------------------------------------------------

export const generateStudioQuestionsInputSchema = z
  .object({
    passageId: z.string().uuid(),
    artifactId: z.string().uuid(),
  })
  .strict();

// Single source of truth for the question-option vocabulary — every question
// shape (AI-generation output, DB-persistence input) reuses this.
export const questionOptionSchema = z
  .object({
    id: z.string(),
    text: z.string(),
  })
  .strict();

// Shape returned by the AI question-generation call (passed directly as the
// `generateObject` schema param in ../services/question-generator.service.ts).
export const generatedQuestionSchema = z
  .object({
    questionText: z.string(),
    options: z.array(questionOptionSchema).min(2),
    correctAnswer: z.string(),
    sourceText: z.string(),
    sourceLine: z.number().int().positive(),
    explanation: z.string(),
    questionType: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]),
    difficulty: z.number().int().min(1).max(5),
  })
  .strict()
  .refine((q) => q.options.some((opt) => opt.id === q.correctAnswer), {
    message: "correctAnswer must match one of the option ids",
    path: ["correctAnswer"],
  });

export const questionGenerationDataSchema = z
  .object({
    questions: z.array(generatedQuestionSchema),
    wordCount: z.number(),
    estimatedTime: z.number(),
  })
  .strict();

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type QuestionGenerationData = z.infer<typeof questionGenerationDataSchema>;

// Response-side shape for a generated question (adds `id`/`number` on top of
// the AI-generation shape, for the client-facing artifact response).
export const generatedStudyQuestionSchema = z
  .object({
    id: z.string(),
    number: z.number().int().positive(),
    questionText: z.string(),
    options: z.array(questionOptionSchema),
    correctAnswer: z.string(),
    explanation: z.string(),
    sourceText: z.string(),
    sourceLine: z.number().int().positive(),
    questionType: z.string(),
    difficulty: z.number(),
  })
  .strict();

export type GeneratedStudyQuestionDto = z.infer<
  typeof generatedStudyQuestionSchema
>;

// Validates a question before it is persisted (DB field names differ from the
// AI-generation shape: `correctOption` instead of `correctAnswer`, plus an
// `artifactId`).
export const questionDataSchema = z
  .object({
    artifactId: z
      .string()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        "Invalid UUID",
      ),
    questionText: z.string(),
    options: z.array(questionOptionSchema).min(2),
    correctOption: z.string(),
    sourceText: z.string(),
    sourceLine: z.number().int().positive(),
    explanation: z.string(),
  })
  .strict()
  .refine((q) => q.options.some((opt) => opt.id === q.correctOption), {
    message: "correctOption must match one of the option ids",
    path: ["correctOption"],
  });
