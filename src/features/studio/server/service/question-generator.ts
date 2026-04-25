import "server-only";
import { generateObject } from "ai";
import {
  questionContentSchema,
  type QuestionContent,
} from "@/features/studio/schema/question";

const QUESTION_SYSTEM_PROMPT = `You are an expert English language educator.
Generate multiple-choice reading comprehension questions that:
- Test understanding (not memory)
- Have clear answers from text
- Range from factual to inferential
- Cover different parts of the passage
- Have plausible but clearly incorrect wrong answers`;

export async function generateComprehensionQuestions(
  passage: string,
  questionCount: number = 5,
): Promise<QuestionContent> {
  const truncated = passage.slice(0, 10_000);

  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: questionContentSchema,
    abortSignal: AbortSignal.timeout(45_000),
    instructions: QUESTION_SYSTEM_PROMPT,
    prompt: `Generate ${questionCount} reading comprehension questions for this passage:\n\n${truncated}`,
  });

  return object;
}
