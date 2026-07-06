"use server";

import { z } from "zod";
import { getUserId } from "@/server/auth/auth-utils";
import {
  fetchStudioArtifacts,
  getArtifactQuestions,
  recordQuizResult,
  resetQuizResult,
} from "@/features/passage/db/studio-artifacts-service";
import { getChatHistory } from "@/server/modules/ai-chat/chat-service";

const passageIdSchema = z.string().uuid();

const recordQuizResultSchema = z
  .object({
    correctCount: z.number().int().nonnegative(),
    totalQuestions: z.number().int().positive(),
  })
  .refine((data) => data.correctCount <= data.totalQuestions, {
    message: "correctCount cannot exceed totalQuestions",
    path: ["correctCount"],
  });

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
  const parsedStats = recordQuizResultSchema.parse(stats);
  const userId = await getUserId();
  await recordQuizResult(artifactId, userId, parsedStats);
}

export async function resetQuizResultAction(artifactId: string) {
  const userId = await getUserId();
  await resetQuizResult(artifactId, userId);
}

export async function getChatHistoryAction(passageId: string) {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const userId = await getUserId();
  const messages = await getChatHistory(userId, parsedPassageId);
  return messages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: message.content }],
  }));
}
