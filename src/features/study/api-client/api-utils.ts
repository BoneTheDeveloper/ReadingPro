export const STUDY_API_ROUTES = {
  questions: "/api/studio-questions",
  studySession: "/api/study-session",
} as const;

export type StudyApiResult<T> = T | { error: string };

export { RequestTimeoutError } from "@/contracts/http/api-client-utils";
