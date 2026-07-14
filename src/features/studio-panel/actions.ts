"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import type { StudioArtifactType } from "@/features/studio-panel/lib/studio-artifact-types";
import {
  fetchStudioArtifacts,
  getArtifactQuestions,
  recordQuizResult,
  resetQuizResult,
} from "./services/studio-artifacts.service";
import { getChatHistory } from "@/features/ai-chat/services/chat.service";
import { studyChatHistoryDataSchema } from "./schemas/chat.schema";
import { recordQuizResultInputSchema } from "./schemas/studio-artifact.schema";
import { generateStudioQuestionsInputSchema } from "./schemas/question.schema";
import {
  generateQuestionsForPassage,
  PassageStudyServiceError,
} from "./services/passage-study.service";

// Studio action types
export type StudioActionId =
  "quiz" | "flashcard" | "summary" | "chat" | "mindmap" | "lookup";

// Artifacts cache types
type ArtifactsCacheStatus = "idle" | "loading" | "success" | "error";

export interface ArtifactsCacheEntry {
  status: ArtifactsCacheStatus;
  data: import("@/features/studio-panel/lib/studio-artifact-types").StudioArtifact[];
  fetchedAt?: number;
  error?: string;
}

export interface ArtifactRef {
  type: StudioArtifactType;
  id: string;
}

export interface ArtifactDetailCacheEntry {
  questions?: import("@/features/studio-panel/schemas/question.schema").GeneratedStudyQuestionDto[];
}

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

export async function getChatHistoryAction(passageId: string) {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const userId = await getUserId();
  const rows = await getChatHistory(userId, parsedPassageId);
  // Validate the mapped shape against the schema instead of an `as` cast, so a
  // future DB role value outside "user"/"assistant" fails loudly here.
  const { messages } = studyChatHistoryDataSchema.parse({
    messages: rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: [{ type: "text" as const, text: row.content }],
    })),
  });
  return messages;
}
