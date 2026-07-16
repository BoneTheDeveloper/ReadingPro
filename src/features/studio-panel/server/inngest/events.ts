/**
 * Studio-panel Inngest event definitions.
 */

import { z } from "zod";

// ---------- Event Name ----------

export const GENERATE_QUESTIONS_EVENT = "studio/questions.generate" as const;

// ---------- Event Payload Schema ----------

export const generateQuestionsEventSchema = z
  .object({
    passageId: z.string().uuid(),
    userId: z.string(),
    questionCount: z.number().int().positive().optional().default(5),
  })
  .strict();

export type GenerateQuestionsEventData = z.infer<typeof generateQuestionsEventSchema>;

// ---------- Event Creator ----------

export function createGenerateQuestionsEvent(data: GenerateQuestionsEventData) {
  return {
    name: GENERATE_QUESTIONS_EVENT,
    data,
  };
}
