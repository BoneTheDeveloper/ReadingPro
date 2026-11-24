import { generateObject, generateText } from "ai";
import {
  passageGenerationOptionsSchema,
  passageMetadataSchema,
  type PassageGenerationOptions,
  type PassageMetadata,
} from "@/shared/passage/schema";
import { AppError } from "@/server/lib/errors";
import { completePassageProcessing } from "../passage-repository";
import { takeWords, titleFromContent } from "./text";

const MODEL = "deepseek/deepseek-v4-flash";
const AI_TIMEOUT_MS = 170_000;

const METADATA_SAMPLE_WORDS = 1000;

const METADATA_INSTRUCTIONS = `You label English passages for language learners.

The text you receive is the OPENING of a longer passage, not the whole passage.
Judge the topic and level from exactly what is there. Never guess at what the rest of the passage contains.
Never invent facts, names, or numbers the text does not state.`;

/**
 * Rewrites/translates the source into an English reading passage. The fixed
 * rules stay constant; level, tone, length and fidelity come from the options
 * the user picked on import (defaults match the original B1–B2 neutral rewrite).
 */
const LEVEL: Record<PassageGenerationOptions["targetLevel"], string> = {
  AUTO: "suitable for CEFR B1-B2 readers",
  A2: "at CEFR A2: short sentences, the 2,000 most common words, present/past simple, explain any unavoidable hard word in simple words",
  B1: "at CEFR B1: clear sentences, everyday vocabulary, occasional less common words made clear by context",
  B2: "at CEFR B2: varied sentence structures and a wider vocabulary, still clear and direct",
  C1: "at CEFR C1: natural, rich vocabulary and complex sentences as in quality native writing",
};

const TONE: Record<PassageGenerationOptions["tone"], string> = {
  NEUTRAL: "neutral and informative",
  CONVERSATIONAL: "friendly and conversational, as if explaining to a friend (still no slang the learner would not know)",
  ACADEMIC: "formal and academic, precise wording, no contractions",
  STORYTELLING: "narrative storytelling with a clear sequence of events and vivid but simple description",
  JOURNALISTIC: "journalistic news style: most important information first, factual, concise",
};

const FIDELITY: Record<PassageGenerationOptions["fidelity"], string> = {
  FREE: "Rewrite completely: do not preserve original wording, sentence structure or order. The result should read like a new passage written for learners.",
  CLOSE: "Stay close to the source: keep its ideas, their order and its examples; simplify and fix the wording, but do not add or drop points.",
};

/** About one paragraph per 120 words, at least 2. */
const paragraphs = (words: number) => Math.max(2, Math.round(words / 120));

function buildPassageInstructions(options: PassageGenerationOptions) {
  return `You are an English reading passage generator for language learners.

INPUT: A text passage (may be in English, Vietnamese, or another language).
OUTPUT: An English reading passage optimized for English learners.

Rules:
- ${FIDELITY[options.fidelity]}
- If source is non-English, translate the meaning into natural, clear English.
- Keep these elements from the source:
  * Proper nouns, names, and titles
  * Specific dates, numbers, and technical terms that carry meaning
  * Key vocabulary words marked with [brackets] in the source (keep these in brackets)
- Do NOT keep: transcription artifacts (um, uh, er), run-on sentences, broken grammar from the source.
- Never invent facts, names, or numbers the source does not state.
- Language level: ${LEVEL[options.targetLevel]}.
- Tone: ${TONE[options.tone]}.
- Length: about ${options.targetWords} words (between ${Math.round(options.targetWords * 0.85)} and ${Math.round(options.targetWords * 1.15)}), in roughly ${paragraphs(options.targetWords)} paragraphs — unless the source has less content than that; never pad.
- Each paragraph has one clear topic; separate paragraphs with a blank line.

Return only the passage. No preamble, no commentary, no markdown, no title.`;
}

async function generateMetadata(sample: string): Promise<PassageMetadata> {
  const { object } = await generateObject({
    model: MODEL,
    schema: passageMetadataSchema,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    instructions: METADATA_INSTRUCTIONS,
    prompt: sample,
    temperature: 0.2,
  });

  return object;
}

async function generatePassage(text: string, options: PassageGenerationOptions): Promise<string> {
  const { text: content } = await generateText({
    model: MODEL,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    instructions: buildPassageInstructions(options),
    prompt: text,
    temperature: 0.3,
  });

  const trimmed = content.trim();
  if (!trimmed) throw new Error("generation returned empty passage");

  return trimmed;
}

export async function runPassageProcessing(args: {
  userId: string;
  passageId: string;
  normalizedText: string;
  userTitle: string;
  options?: PassageGenerationOptions;
}): Promise<void> {
  const options = passageGenerationOptionsSchema.parse(args.options ?? {});
  // Run metadata and passage generation in parallel
  const [metadata, content] = await Promise.allSettled([
    generateMetadata(takeWords(args.normalizedText, METADATA_SAMPLE_WORDS)),
    generatePassage(args.normalizedText, options),
  ]);

  if (content.status === "rejected") throw content.reason;

  const meta = metadata.status === "fulfilled" ? metadata.value : null;

  const passage = await completePassageProcessing({
    userId: args.userId,
    passageId: args.passageId,
    content: content.value,
    title: meta?.title || args.userTitle || titleFromContent(content.value),
    // A chosen level is what the passage was written at; otherwise trust the label.
    cefrLevel: options.targetLevel !== "AUTO" ? options.targetLevel : (meta?.cefrLevel ?? null),
  });
  // Deleted while processing: fail the step so the workflow does not report success.
  if (!passage) {
    throw new AppError("passage.not_found", "Passage not found", { id: args.passageId });
  }
}
