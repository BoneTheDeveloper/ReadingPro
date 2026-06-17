import {
  studySessionResponseSchema,
} from "@/contracts/study/study-response-schema";
import { postJson } from "@/contracts/http/api-client-utils";
import { STUDY_API_ROUTES, type StudyApiResult } from "./api-utils";

export async function ensureStudySession(): Promise<StudyApiResult<{
  sessionId: string;
}>> {
  const payload = await postJson(STUDY_API_ROUTES.studySession, {}, studySessionResponseSchema);
  if ("error" in payload) return { error: payload.error };
  return { sessionId: payload.data.id };
}
