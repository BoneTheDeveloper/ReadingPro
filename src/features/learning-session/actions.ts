"use server";

import { getUserId } from "@/lib/auth-server";
import { ensureActiveSession } from "./db/learning-session-queries";
import { toLearningSessionDto } from "./schemas/learning-session.schema";

/**
 * Ensure an active learning session exists for the current user,
 * creating one if needed.
 */
export async function ensureStudySessionAction() {
  const userId = await getUserId();
  const session = await ensureActiveSession(userId);
  return toLearningSessionDto(session);
}
