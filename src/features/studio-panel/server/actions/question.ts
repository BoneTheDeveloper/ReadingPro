"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  await recordQuizResult(artifactId, session.user.id, parsedStats);
}

export async function resetQuizResultAction(artifactId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  await resetQuizResult(artifactId, session.user.id);
}

export async function generateStudioQuestionsAction(input: {
  passageId: string;
  artifactId: string;
}) {
  const { passageId, artifactId } = generateStudioQuestionsInputSchema.parse(input);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  try {
    const { artifact, questions } = await generateQuestionsForPassage(
      session.user.id,
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
