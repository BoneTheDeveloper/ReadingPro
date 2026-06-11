import type { z } from "zod";

export const STUDY_API_ROUTES = {
  questions: "/api/study-questions",
  quizAttempt: "/api/quiz-attempt",
  studySession: "/api/study-session",
} as const;

export type StudyApiResult<T> = T | { error: string };

export async function postJson<TSchema extends z.ZodType>(
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

export async function patchJson<TSchema extends z.ZodType>(
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
