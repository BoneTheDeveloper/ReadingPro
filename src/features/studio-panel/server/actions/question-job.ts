"use server";

import { inngest } from "@/infrastructure/inngest";
import { createGenerateQuestionsEvent } from "../inngest/events";

export async function requestQuestionGeneration(params: {
  passageId: string;
  userId: string;
  questionCount?: number;
}): Promise<{ jobId: string }> {
  const { passageId, userId, questionCount = 5 } = params;

  const result = await inngest.send(
    createGenerateQuestionsEvent({ passageId, userId, questionCount })
  );

  return { jobId: result.ids[0] ?? "" };
}
