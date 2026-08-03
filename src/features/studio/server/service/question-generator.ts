import "server-only";
import { generateObject } from "ai";
import {
  questionContentSchema,
  type QuestionContent,
} from "@/features/studio/schema/question";
import { updateArtifactStatus } from "@/features/studio/server/service/artifact-crud";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";

const QUESTION_SYSTEM_PROMPT = `You are an expert English language educator.
Generate multiple-choice reading comprehension questions that:
- Test understanding (not memory)
- Have clear answers from text
- Range from factual to inferential
- Cover different parts of the passage
- Have plausible but clearly incorrect wrong answers`;

async function generateComprehensionQuestions(
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


export async function generateAndStoreArtifact(args: {
  artifactId: string;
  userId: string;
  passageId: string;
}): Promise<void> {
    const passage = await findPassageForUser(args.userId, args.passageId);
    if (!passage) return;

    const content = await generateComprehensionQuestions(passage.content, 5);

    await updateArtifactStatus({
      id: args.artifactId,
      userId: args.userId,
      status: "COMPLETED",
      content: content as object,
    });
}
