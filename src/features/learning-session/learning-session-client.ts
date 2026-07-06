"use client";

import { postJson } from "@/lib/http/api-request";
import { learningSessionResponseSchema } from "@/contracts/learning-session/learning-session-response-schema";

/**
 * Ensure an active learning session exists, creating one if needed.
 */
export async function ensureStudySession() {
  const result = await postJson(
    "/api/learning-session",
    {},
    learningSessionResponseSchema,
  );
  if ("error" in result) {
    throw new Error(result.error);
  }
  return { sessionId: result.data.id };
}
