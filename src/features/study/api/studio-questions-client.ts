import { generatedStudyQuestionsResponseSchema } from "@/lib/study/shared/study-response-schema";
import {
  STUDIO_GENERATION_TIMEOUT_MS,
  type StudioArtifactErrorCode,
} from "@/lib/study/shared/studio-artifact-types";
import type { QuestionData } from "@/features/study/model/types";
import { STUDY_API_ROUTES, postJson, RequestTimeoutError } from "./api-utils";

export type GenerateStudioQuestionsResult =
  | { questions: QuestionData[] }
  | { error: string; code: StudioArtifactErrorCode };

export async function generateStudioQuestions(input: {
  passageId: string;
  artifactId: string;
}): Promise<GenerateStudioQuestionsResult> {
  try {
    const payload = await postJson(
      STUDY_API_ROUTES.questions,
      input,
      generatedStudyQuestionsResponseSchema,
      STUDIO_GENERATION_TIMEOUT_MS,
    );
    if ("error" in payload) {
      return { error: payload.error, code: (payload.code as StudioArtifactErrorCode | undefined) ?? "UNKNOWN" };
    }
    return { questions: payload.data.questions };
  } catch (err) {
    // A client abort (timeout) always settles here so the caller never hangs.
    if (err instanceof RequestTimeoutError) {
      return { error: err.message, code: "TIMEOUT" };
    }
    return { error: err instanceof Error ? err.message : "Generation failed", code: "UNKNOWN" };
  }
}
