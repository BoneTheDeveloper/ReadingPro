import {
  studySessionResponseSchema,
} from "@/lib/study/shared/study-response-schema";
import { STUDY_API_ROUTES, postJson, type StudyApiResult } from "./api-utils";

export async function ensureStudySession(): Promise<StudyApiResult<{
  sessionId: string;
}>> {
  const payload = await postJson(STUDY_API_ROUTES.studySession, {}, studySessionResponseSchema);
  if ("error" in payload) return { error: payload.error };
  return { sessionId: payload.data.id };
}
