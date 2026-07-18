import "server-only";
import { generateObject } from "ai";
import { openai, getModel, wrapUserText, withAITrace } from "@/infrastructure/ai";
import { moduleLog } from "@/lib/logger";
import {
  questionGenerationDataSchema,
  type QuestionGenerationData,
} from "@/features/studio-panel/schemas/question";

const log = moduleLog("studio-panel:question-generator");

export async function generateComprehensionQuestions(
  passage: string,
  questionCount: number = 5,
): Promise<QuestionGenerationData | null> {
  try {
    const numberedPassage = passage
      .split("\n")
      .map((line, i) => `${i + 1}: ${line}`)
      .join("\n");

    const modelId = getModel("structured");

    const { object } = await withAITrace(
      { operation: "generate-questions", feature: "studio-panel", model: modelId },
      () =>
        generateObject({
          model: openai(modelId),
          schema: questionGenerationDataSchema,
          system: `You are an expert English language educator. Generate multiple-choice reading comprehension questions that: test understanding (not memory), have clear answers from text, include line number citations, range factual to inferential, cover different parts of passage. Wrong answers should be plausible but clearly incorrect.`,
          prompt: `Generate ${questionCount} reading comprehension questions for this passage:

${wrapUserText(numberedPassage)}`,
        })
    );

    return object;
  } catch (error) {
    log.error(
      { err: error, context: { questionCount, passageLength: passage.length } },
      "Question generation failed",
    );
    return null;
  }
}
