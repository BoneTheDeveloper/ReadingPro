"use client";

import { postJson } from "@/lib/http/api-request";
import { learningSessionSuccessResponseSchema } from "./schemas/learning-session.schema";

/**
 * Ensure an active learning session exists, creating one if needed.
 */
export async function ensureStudySession() {
  const result = await postJson(
    "/api/learning-session",
    {},
    learningSessionSuccessResponseSchema,
  );
  if ("error" in result) {
    throw new Error(String(result.error));
  }
  return { sessionId: result.id };
}
