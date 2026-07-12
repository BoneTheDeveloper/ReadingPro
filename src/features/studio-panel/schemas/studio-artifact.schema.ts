import { z } from "zod";
import { generatedStudyQuestionSchema } from "./question.schema";

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

export const studioArtifactResponseSchema = z
  .object({
    id: z.string(),
    type: z.enum(["quiz", "flashcard"]),
    passageId: z.string(),
    title: z.string(),
    status: z.enum(["generating", "done", "failed"]),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })
  .strict();

// An artifact wraps its generated questions — this composite forward-depends
// on the question domain (./question.schema), it doesn't own question shapes.
export const generatedStudyQuestionsSchema = z
  .object({
    artifact: studioArtifactResponseSchema,
    questions: z.array(generatedStudyQuestionSchema),
  })
  .strict();

export type GeneratedStudyQuestionsDto = z.infer<
  typeof generatedStudyQuestionsSchema
>;
export type StudioArtifactResponseDto = z.infer<
  typeof studioArtifactResponseSchema
>;
