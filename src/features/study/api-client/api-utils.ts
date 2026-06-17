const BASE = "/api/study";

export const STUDY_API_ROUTES = {
  chat: `${BASE}/chat`,
  sessions: `${BASE}/sessions`,
  questions: `${BASE}/questions`,

  artifacts: `${BASE}/artifacts`,
  artifact: (id: string) => `${BASE}/artifacts/${id}`,
  quizResult: (id: string) => `${BASE}/artifacts/${id}/quiz-result`,
} as const;

export type StudyApiResult<T> = T | { error: string };

export { RequestTimeoutError } from "@/contracts/http/api-client-utils";
