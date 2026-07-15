"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import {
  fetchStudioArtifacts,
  getArtifactQuestions,
  recordQuizResult,
  resetQuizResult,
} from "../services/studio-artifacts";
import { getChatHistory } from "../services/ai-chat";
import type { StudyChatHistoryDto } from "@/features/studio-panel/schemas/ai-chat";
import { recordQuizResultInputSchema } from "@/features/studio-panel/schemas/studio-artifact";
import { generateStudioQuestionsInputSchema } from "@/features/studio-panel/schemas/question";
import {
  generateQuestionsForPassage,
  PassageStudyServiceError,
} from "../services/passage-study";

export type StudioActionId =
  "quiz" | "flashcard" | "summary" | "chat" | "mindmap" | "lookup";

const passageIdSchema = z.string().uuid();

export async function getStudioArtifactsAction(passageId: string) {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const userId = await getUserId();
  return fetchStudioArtifacts(userId, parsedPassageId);
}

export async function getArtifactQuestionsAction(artifactId: string) {
  const userId = await getUserId();
  return getArtifactQuestions(userId, artifactId);
}

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
    // Service rejections carry a stable error code the UI localizes; keep it
    // instead of letting Next.js replace the error with an opaque digest.
    if (error instanceof PassageStudyServiceError) {
      return { success: false as const, error: error.message, code: error.code };
    }
    throw error;
  }
}

export async function getChatHistoryAction(passageId: string): Promise<StudyChatHistoryDto["messages"]> {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const userId = await getUserId();
  const rows = await getChatHistory(userId, parsedPassageId);
  return rows.map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: row.content }],
  }));
}
