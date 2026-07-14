"use client";

import {
  STUDIO_GENERATION_TIMEOUT_MS,
  type StudioArtifact,
  type StudioArtifactErrorCode,
} from "@/features/studio-panel/lib/studio-artifact-types";
import type { GeneratedStudyQuestionDto } from "@/features/studio-panel/schemas/question.schema";
import { generateStudioQuestionsAction } from "../action";

export type GenerateStudioQuestionsResult =
  | { artifact: StudioArtifact; questions: GeneratedStudyQuestionDto[] }
  | { error: string; code: StudioArtifactErrorCode };

const TIMEOUT_SENTINEL = Symbol("studio-questions-timeout");

export async function generateStudioQuestions(input: {
  passageId: string;
  artifactId: string;
}): Promise<GenerateStudioQuestionsResult> {
  try {
    // Race the action against the generation budget so the caller always
    // settles, even if the server invocation hangs.
    const result = await raceWithTimeout(
      generateStudioQuestionsAction(input),
      STUDIO_GENERATION_TIMEOUT_MS,
    );
    if (result === TIMEOUT_SENTINEL) {
      return { error: "Request timed out", code: "TIMEOUT" };
    }
    if (!result.success) {
      return { error: result.error, code: result.code };
    }
    return { artifact: result.artifact, questions: result.questions };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Generation failed",
      code: "UNKNOWN",
    };
  }
}

async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | typeof TIMEOUT_SENTINEL> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
