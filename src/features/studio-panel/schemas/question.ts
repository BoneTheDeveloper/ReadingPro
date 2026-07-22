import { z } from "zod";

// =============================================================================
// INPUT — client sends this (validated in actions)
// =============================================================================

export const generateStudioQuestionsInputSchema = z
  .object({
    passageId: z.string().uuid(),
    artifactId: z.string().uuid(),
  })
  .strict();

// =============================================================================
// SHARED — used by AI generation and DB persistence
// =============================================================================

const questionOptionSchema = z
  .object({
    id: z.string(),
    text: z.string(),
  })
  .strict();

// =============================================================================
// AI GENERATION — validates AI output (not a DTO, internal validation)
// =============================================================================

const generatedQuestionSchema = z
  .object({
    questionText: z.string(),
    options: z.array(questionOptionSchema).min(2),
    correctAnswer: z.string(),
    sourceText: z.string(),
    sourceLine: z.number().int().positive(),
    explanation: z.string(),
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

// =============================================================================
// OUTPUT — server returns this (DTOs)
// =============================================================================

export interface GeneratedQuestionDto {
  id: string;
  number: number;
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  sourceText?: string;
  sourceLine?: number;
  difficulty: number;
}

// =============================================================================
// DB PERSISTENCE — validates before saving to DB (not a DTO)
// =============================================================================

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
