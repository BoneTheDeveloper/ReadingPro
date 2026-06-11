import type { z } from "zod";
import {
  generatedStudyQuestionsResponseSchema,
  quizAttemptResponseSchema,
  studySessionResponseSchema,
} from "@/lib/study/shared/study-response-schema";
import type { QuestionData } from "@/features/study/model/types";

const STUDY_API_ROUTES = {
  questions: "/api/study-questions",
  quizAttempt: "/api/quiz-attempt",
  studySession: "/api/study-session",
} as const;

type StudyApiResult<T> = T | { error: string };

async function postJson<TSchema extends z.ZodType>(
  route: string,
  body: unknown,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ error: "Invalid server response." }));
  return schema.parse(payload);
}

async function patchJson<TSchema extends z.ZodType>(
  route: string,
  body: unknown,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch(route, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ error: "Invalid server response." }));
  return schema.parse(payload);
}

export async function generateStudyQuestions(input: {
  passageId: string;
}): Promise<StudyApiResult<{ questions: QuestionData[] }>> {
  const payload = await postJson(STUDY_API_ROUTES.questions, input, generatedStudyQuestionsResponseSchema);
  if ("error" in payload) return { error: payload.error };
  return { questions: payload.data.questions };
}

export async function createQuizAttemptForPassage(passageId: string): Promise<StudyApiResult<{
  sessionId: string;
  attemptId: string;
}>> {
  const sessionPayload = await postJson(STUDY_API_ROUTES.studySession, { passageId }, studySessionResponseSchema);
  if ("error" in sessionPayload) return { error: sessionPayload.error };

  const attemptPayload = await postJson(
    STUDY_API_ROUTES.quizAttempt,
    { studySessionId: sessionPayload.data.id, passageId },
    quizAttemptResponseSchema,
  );
  if ("error" in attemptPayload) return { error: attemptPayload.error };

  return {
    sessionId: sessionPayload.data.id,
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
