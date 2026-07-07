import { generatedStudyQuestionsResponseSchema } from "@/features/studio-panel/schemas/study.schema";
import {
  STUDIO_GENERATION_TIMEOUT_MS,
  type StudioArtifact,
  type StudioArtifactErrorCode,
} from "@/features/studio-panel/lib/studio-artifact-types";
import type { GeneratedStudyQuestionDto } from "@/features/studio-panel/schemas/study.schema";
import { postJson, RequestTimeoutError } from "@/lib/http/api-request";

export type GenerateStudioQuestionsResult =
  | { artifact: StudioArtifact; questions: GeneratedStudyQuestionDto[] }
  | { error: string; code: StudioArtifactErrorCode };

export async function generateStudioQuestions(input: {
  passageId: string;
  artifactId: string;
}): Promise<GenerateStudioQuestionsResult> {
  try {
    const payload = await postJson(
      "/api/studio/questions",
      input,
      generatedStudyQuestionsResponseSchema,
      STUDIO_GENERATION_TIMEOUT_MS,
    );
    if ("error" in payload) {
      return {
        error: payload.error,
        code:
          (payload.code as StudioArtifactErrorCode | undefined) ?? "UNKNOWN",
      };
    }
    return {
      artifact: payload.data.artifact as StudioArtifact,
      questions: payload.data.questions,
    };
  } catch (err) {
    // A client abort (timeout) always settles here so the caller never hangs.
    if (err instanceof RequestTimeoutError) {
      return { error: err.message, code: "TIMEOUT" };
    }
    return {
      error: err instanceof Error ? err.message : "Generation failed",
      code: "UNKNOWN",
    };
  }
}
