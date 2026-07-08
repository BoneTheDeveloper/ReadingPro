"use server";

import { z } from "zod";
import { getUserId } from "@/services/clerk";
import type { StudioArtifactType } from "@/features/studio-panel/lib/studio-artifact-types";
import {
  fetchStudioArtifacts,
  getArtifactQuestions,
  recordQuizResult,
  resetQuizResult,
} from "@/features/passage/services/studio-artifacts.service";
import { getChatHistory } from "@/features/ai-chat/services/chat-service";

// Studio action types
export type StudioActionId =
  "quiz" | "flashcard" | "summary" | "chat" | "mindmap" | "lookup";

export interface StudioAction {
  id: StudioActionId;
  label: string;
  description: string;
  iconName: string;
  disabled?: boolean;
}

// Artifacts cache types
export type ArtifactsCacheStatus = "idle" | "loading" | "success" | "error";

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
  questions?: import("@/features/studio-panel/schemas/study.schema").GeneratedStudyQuestionDto[];
  simplifiedContent?: string | null;
  simplifiedLevel?: string | null;
}

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
