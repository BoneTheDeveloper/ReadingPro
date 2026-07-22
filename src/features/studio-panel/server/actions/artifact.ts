"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { fetchStudioArtifacts, getArtifactQuestions, removeStudioArtifact } from "../services/studio-artifacts";

export type StudioActionId = "quiz" | "flashcard" | "summary" | "chat" | "mindmap" | "lookup";

const passageIdSchema = z.string().uuid();
const artifactIdSchema = z.string().uuid();

export async function getStudioArtifactsAction(passageId: string) {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const userId = await getUserId();
  return fetchStudioArtifacts(userId, parsedPassageId);
}

export async function getArtifactQuestionsAction(artifactId: string) {
  const parsedArtifactId = artifactIdSchema.parse(artifactId);
  const userId = await getUserId();
  return getArtifactQuestions(userId, parsedArtifactId);
}
