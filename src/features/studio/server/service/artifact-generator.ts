import "server-only";
import { generateObject } from "ai";
import { updateArtifactStatus } from "@/features/studio/server/service/artifact-crud";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { NotFoundError } from "@/lib/error/app-error";
import {
  questionContentSchema,
  flashcardContentSchema,
  type QuestionContent,
  type FlashcardContent,
} from "@/features/studio/schema/artifact";
import { StudioArtifactType } from "@/generated/prisma/enums";

// ─── Prompt templates ─────────────────────────────────────────────

const QUESTION_SYSTEM_PROMPT = `You are an expert English language educator.
Generate multiple-choice reading comprehension questions that:
- Test understanding (not memory)
- Have clear answers from text
- Range from factual to inferential
- Cover different parts of the passage
- Have plausible but clearly incorrect wrong answers`;

const FLASHCARD_SYSTEM_PROMPT = `You are an expert English language educator.
Generate 5 flashcards from the passage.

Each flashcard:
- Front: A key term, important quote, or question from the passage
- Back: Clear, concise answer or definition

Focus on meaningful content worth memorizing.`;

// ─── Generation functions ─────────────────────────────────────────

async function generateQuestions(passage: string): Promise<QuestionContent> {
  const truncated = passage.slice(0, 10_000);

  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: questionContentSchema,
    abortSignal: AbortSignal.timeout(45_000),
    instructions: QUESTION_SYSTEM_PROMPT,
    prompt: `Generate 5 reading comprehension questions for this passage:\n\n${truncated}`,
  });

  return object;
}

async function generateFlashcards(passage: string): Promise<FlashcardContent> {
  const truncated = passage.slice(0, 10_000);

  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: flashcardContentSchema,
    abortSignal: AbortSignal.timeout(45_000),
    instructions: FLASHCARD_SYSTEM_PROMPT,
    prompt: `Generate 5 flashcards from this passage:\n\n${truncated}`,
  });

  return object;
}

// ─── Main generator ───────────────────────────────────────────────

const generators = {
  [StudioArtifactType.QUESTION]: generateQuestions,
  [StudioArtifactType.FLASHCARD]: generateFlashcards,
} as const;

export async function generateAndStoreArtifact(args: {
  artifactId: string;
  userId: string;
  passageId: string;
  type: StudioArtifactType;
}): Promise<void> {
  const passage = await findPassageForUser(args.userId, args.passageId);
  if (!passage) throw new NotFoundError("Passage", args.passageId);

  const generate = generators[args.type];
  if (!generate) {
    throw new Error(`Unknown artifact type: ${args.type}`);
  }

  const content = await generate(passage.content);

  await updateArtifactStatus({
    id: args.artifactId,
    userId: args.userId,
    status: "COMPLETED",
    content: content as object,
  });
}
