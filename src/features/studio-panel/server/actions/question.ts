"use server";

import { getUserId } from "@/lib/auth/auth-server";
import { recordQuizResult, resetQuizResult } from "../services/studio-artifacts";
import { recordQuizResultInputSchema } from "@/features/studio-panel/schemas/studio-artifact";
import { generateStudioQuestionsInputSchema } from "@/features/studio-panel/schemas/question";
import {
  generateQuestionsForPassage,
  QuestionServiceError,
} from "../services/question/questions";

export async function recordQuizResultAction(
  artifactId: string,
  stats: { correctCount: number; totalQuestions: number },
) {
  const parsedStats = recordQuizResultInputSchema.parse(stats);
  const userId = await getUserId();
  await recordQuizResult(artifactId, userId, parsedStats);
}

export async function resetQuizResultAction(artifactId: string) {
  const userId = await getUserId();
  await resetQuizResult(artifactId, userId);
}

export async function generateStudioQuestionsAction(input: {
  passageId: string;
  artifactId: string;
}) {
  const { passageId, artifactId } = generateStudioQuestionsInputSchema.parse(input);
  const userId = await getUserId();
  try {
    const { artifact, questions } = await generateQuestionsForPassage(
      userId,
      passageId,
      artifactId,
    );
    return { success: true as const, artifact, questions };
  } catch (error) {
    if (error instanceof QuestionServiceError) {
      return { success: false as const, error: error.message, code: error.code };
    }
    throw error;
  }
}
