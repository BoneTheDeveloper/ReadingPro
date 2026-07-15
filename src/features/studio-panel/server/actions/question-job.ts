"use server";

import { inngest } from "@/infrastructure/inngest";
import { GENERATE_QUESTIONS_EVENT } from "../jobs/generate-questions";

export async function requestQuestionGeneration(params: {
  passageId: string;
  userId: string;
  questionCount?: number;
}): Promise<{ jobId: string }> {
  const { passageId, userId, questionCount = 5 } = params;

  const result = await inngest.send({
    name: GENERATE_QUESTIONS_EVENT,
    data: {
      passageId,
      userId,
      questionCount,
    },
  });

  return { jobId: result.ids[0] ?? "" };
}
