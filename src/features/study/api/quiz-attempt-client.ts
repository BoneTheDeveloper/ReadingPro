import {
  quizAttemptResponseSchema,
} from "@/lib/study/shared/study-response-schema";
import { STUDY_API_ROUTES, postJson, patchJson, type StudyApiResult } from "./api-utils";
import { ensureStudySession } from "./study-session-client";

export async function createQuizAttemptForPassage(passageId: string): Promise<StudyApiResult<{
  sessionId: string;
  attemptId: string;
}>> {
  const sessionPayload = await ensureStudySession();
  if ("error" in sessionPayload) return { error: sessionPayload.error };

  const attemptPayload = await postJson(
    STUDY_API_ROUTES.quizAttempt,
    { studySessionId: sessionPayload.sessionId, passageId },
    quizAttemptResponseSchema,
  );
  if ("error" in attemptPayload) return { error: attemptPayload.error };

  return {
    sessionId: sessionPayload.sessionId,
    attemptId: attemptPayload.data.id,
  };
}

export async function completeQuizAttempt(input: {
  attemptId: string;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
}): Promise<StudyApiResult<{ attemptId: string }>> {
  const payload = await patchJson(STUDY_API_ROUTES.quizAttempt, input, quizAttemptResponseSchema);
  if ("error" in payload) return { error: payload.error };
  return { attemptId: payload.data.id };
}
