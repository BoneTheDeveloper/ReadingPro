"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { fetchStudioArtifacts, getArtifactQuestions } from "../services/studio-artifacts";

const passageIdSchema = z.string().uuid();
const artifactIdSchema = z.string().uuid();

export async function getStudioArtifactsAction(passageId: string) {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  return fetchStudioArtifacts(session.user.id, parsedPassageId);
}

export async function getArtifactQuestionsAction(artifactId: string) {
  const parsedArtifactId = artifactIdSchema.parse(artifactId);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  return getArtifactQuestions(session.user.id, parsedArtifactId);
}
