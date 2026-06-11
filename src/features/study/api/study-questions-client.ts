import { generatedStudyQuestionsResponseSchema } from "@/lib/study/shared/study-response-schema";
import type { QuestionData } from "@/features/study/model/types";
import { STUDY_API_ROUTES, postJson, type StudyApiResult } from "./api-utils";

export async function generateStudyQuestions(input: {
  passageId: string;
}): Promise<StudyApiResult<{ questions: QuestionData[] }>> {
  const payload = await postJson(STUDY_API_ROUTES.questions, input, generatedStudyQuestionsResponseSchema);
  if ("error" in payload) return { error: payload.error };
  return { questions: payload.data.questions };
}
