const BASE = "/api/study";
const STUDIO = `${BASE}/studio`;

export const STUDY_API_ROUTES = {
  sessions: `${BASE}/sessions`,

  // Studio panel sub-routes (chat, quiz questions/artifacts)
  chat: `${STUDIO}/chat`,
  questions: `${STUDIO}/questions`,
  artifacts: `${STUDIO}/artifacts`,
  artifact: (id: string) => `${STUDIO}/artifacts/${id}`,
  quizResult: (id: string) => `${STUDIO}/artifacts/${id}/quiz-result`,
} as const;

export type StudyApiResult<T> = T | { error: string };

export { RequestTimeoutError } from "@/contracts/http/api-client-utils";
