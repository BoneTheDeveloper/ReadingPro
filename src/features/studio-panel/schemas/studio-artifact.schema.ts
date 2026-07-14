import { z } from "zod";

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
