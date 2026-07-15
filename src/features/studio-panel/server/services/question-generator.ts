import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { moduleLog } from "@/lib/observability/logger";
import { wrapUserText } from "@/infrastructure/ai/prompt-utils";
import {
  questionGenerationDataSchema,
  type QuestionGenerationData,
} from "../../schemas/question";

export type { GeneratedQuestion } from "../../schemas/question";
export type QuestionGenerationResult = QuestionGenerationData;

const log = moduleLog("studio-panel:question-generator");

export async function generateComprehensionQuestions(
  passage: string,
  questionCount: number = 5,
): Promise<QuestionGenerationResult | null> {
  try {
    const numberedPassage = passage
      .split("\n")
      .map((line, i) => `${i + 1}: ${line}`)
      .join("\n");

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: questionGenerationDataSchema,
      system: `You are an expert English language educator. Generate multiple-choice reading comprehension questions that: test understanding (not memory), have clear answers from text, include line number citations, range factual to inferential, cover different parts of passage. Wrong answers should be plausible but clearly incorrect.`,
      prompt: `Generate ${questionCount} reading comprehension questions for this passage:

${wrapUserText(numberedPassage)}`,
    });

    return object;
  } catch (error) {
    log.error(
      { err: error, context: { questionCount, passageLength: passage.length } },
      "Question generation failed",
    );
    return null;
  }
}
