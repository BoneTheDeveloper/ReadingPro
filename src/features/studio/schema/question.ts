import { z } from "zod";

const QUESTION_OPTIONS_COUNT = 4 as const;

const questionSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).length(QUESTION_OPTIONS_COUNT),
  correctIndex: z.number().int().min(0).max(QUESTION_OPTIONS_COUNT - 1),
  sourceText: z.string(),
  explanation: z.string(),
});


export const questionContentSchema = z.object({
  questions: z.array(questionSchema).min(1),
});

export type QuestionContent = z.infer<typeof questionContentSchema>;

export const questionProgressSchema = z.object({
  currentIndex: z.number().int().nonnegative(),
  answers: z.array(z.number().int().nullable()),
  correctCount: z.number().int().nonnegative(),
  isCompleted: z.boolean(),
});

export type QuestionProgress = z.infer<typeof questionProgressSchema>;
