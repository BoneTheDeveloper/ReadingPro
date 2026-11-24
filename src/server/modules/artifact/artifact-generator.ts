import { generateObject } from "ai";
import { AppError } from "@/server/lib/errors";
import { updateArtifactStatus } from "./artifact-repository";
import { requireOwnedPassage } from "@/server/modules/passage";
import {
  questionContentSchema,
  flashcardContentSchema,
  type QuestionContent,
  type FlashcardContent,
} from "@/shared/studio/artifact";
import type { CEFRLevel } from "@/shared/enums";
import { StudioArtifactType } from "@/shared/enums";
import {
  flashcardGenerationOptionsSchema,
  questionGenerationOptionsSchema,
} from "@/shared/studio/generation-options";
import {
  buildFlashcardPrompt,
  buildQuestionPrompt,
  flashcardOutputSchema,
  normalizeFlashcards,
  normalizeQuestions,
  questionOutputSchema,
} from "./artifact-prompts";

const MODEL = "openai/gpt-4o-mini";
const PASSAGE_CHAR_LIMIT = 10_000;

/** Larger sets take longer to write; give each item its own share of time. */
const timeoutFor = (count: number) => AbortSignal.timeout(30_000 + count * 6_000);

async function generateQuestions(passage: string, cefrLevel: CEFRLevel | null, rawOptions: unknown): Promise<QuestionContent> {
  const options = questionGenerationOptionsSchema.parse(rawOptions ?? {});
  const { instructions, prompt } = buildQuestionPrompt(passage.slice(0, PASSAGE_CHAR_LIMIT), options, cefrLevel);

  const { object } = await generateObject({
    model: MODEL,
    schema: questionOutputSchema,
    abortSignal: timeoutFor(options.count),
    instructions,
    prompt,
  });

  // Fails the workflow (artifact → FAILED) when nothing usable came back.
  return questionContentSchema.parse({ questions: normalizeQuestions(object, options), settings: options });
}

async function generateFlashcards(passage: string, cefrLevel: CEFRLevel | null, rawOptions: unknown): Promise<FlashcardContent> {
  const options = flashcardGenerationOptionsSchema.parse(rawOptions ?? {});
  const { instructions, prompt } = buildFlashcardPrompt(passage.slice(0, PASSAGE_CHAR_LIMIT), options, cefrLevel);

  const { object } = await generateObject({
    model: MODEL,
    schema: flashcardOutputSchema,
    abortSignal: timeoutFor(options.count),
    instructions,
    prompt,
  });

  return flashcardContentSchema.parse({ cards: normalizeFlashcards(object, options), settings: options });
}

const generators = {
  [StudioArtifactType.QUESTION]: generateQuestions,
  [StudioArtifactType.FLASHCARD]: generateFlashcards,
} as const;

export async function generateAndStoreArtifact(args: {
  artifactId: string;
  userId: string;
  passageId: string;
  type: StudioArtifactType;
  /** Validated against the type's option schema here; missing means defaults. */
  options?: unknown;
}): Promise<void> {
  const passage = await requireOwnedPassage(args.userId, args.passageId);

  const generate = generators[args.type];
  if (!generate) {
    throw new Error(`Unknown artifact type: ${args.type}`);
  }

  const content = await generate(passage.content, passage.cefrLevel, args.options);

  const artifact = await updateArtifactStatus({
    id: args.artifactId,
    userId: args.userId,
    status: "COMPLETED",
    content,
  });
  if (!artifact) {
    throw new AppError("artifact.not_found", "Artifact not found", { id: args.artifactId });
  }
}
