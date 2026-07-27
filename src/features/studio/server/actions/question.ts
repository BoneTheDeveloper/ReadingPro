"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { recordQuestionResult, resetQuestionResult } from "../services/studio-artifacts";
import { recordQuestionResultInputSchema } from "@/features/studio/schemas/studio";
import { generateStudioQuestionsInputSchema } from "@/features/studio/schemas/question";
import {
  generateQuestionsForPassage,
  QuestionServiceError,
} from "../services/question-generator";

export async function recordQuestionResultAction(
  artifactId: string,
  stats: { correctCount: number; totalQuestions: number },
) {
  const parsedStats = recordQuestionResultInputSchema.parse(stats);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  await recordQuestionResult(artifactId, session.user.id, parsedStats);
}

export async function resetQuestionResultAction(artifactId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  await resetQuestionResult(artifactId, session.user.id);
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
