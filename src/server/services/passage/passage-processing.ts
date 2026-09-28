import "server-only";
import { generateObject, generateText } from "ai";
import {
  passageMetadataSchema,
  type PassageMetadata,
} from "@/features/passage/schema";
import { completePassageProcessing } from "@/features/passage/server/service/passage-crud";

const MODEL = "deepseek/deepseek-v4-flash";
const AI_TIMEOUT_MS = 170_000;

const METADATA_SAMPLE_WORDS = 1000;

const METADATA_INSTRUCTIONS = `You label English passages for language learners.

The text you receive is the OPENING of a longer passage, not the whole passage.
Judge the topic and level from exactly what is there. Never guess at what the rest of the passage contains.
Never invent facts, names, or numbers the text does not state.`;

/**
 * Rewrites/translates passages for English learners.
 * Key principles:
 * - Rewrite completely — do NOT preserve original structure, wording, or formatting.
 * - Output is English. If the source is in another language (e.g., Vietnamese),
 *   translate the meaning into natural English suitable for language learners.
 * - Preserve ONLY: key terms, proper nouns, names, dates, and difficult-to-translate
 *   phrases that appear in [brackets] in the source.
 * - The result should feel like a new passage written for English learners, not a
 *   "cleaned up" version of the original.
 * - Keep paragraph breaks natural — typically 2-4 paragraphs maximum.
 */
const PASSAGE_GENERATION_INSTRUCTIONS = `You are an English reading passage generator for language learners.

INPUT: A text passage (may be in English, Vietnamese, or another language).
OUTPUT: A completely rewritten English passage optimized for English learners.

Rules:
- Rewrite ALL content in natural English. Do not preserve original wording, sentence structure, or phrasing.
- If source is non-English, translate the meaning into natural, clear English.
- Keep ONLY these elements from the source:
  * Proper nouns, names, and titles
  * Specific dates, numbers, and technical terms that carry meaning
  * Key vocabulary words marked with [brackets] in the source (keep these in brackets)
- Do NOT keep: colloquialisms, run-on sentences, transcription artifacts (um, uh, er), broken grammar from the source.
- Paragraph structure: 2-5 paragraphs, each with a clear topic. Combine fragmented thoughts.
- Tone: Neutral, informative, suitable for CEFR B1-B2 readers.
- Length: 200-600 words unless source content is shorter.

Return only the passage. No preamble, no commentary, no markdown fences.`;

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

async function generatePassage(text: string): Promise<string> {
  const { text: content } = await generateText({
    model: MODEL,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    instructions: PASSAGE_GENERATION_INSTRUCTIONS,
    prompt: text,
    temperature: 0.3,
  });

  const trimmed = content.trim();
  if (!trimmed) throw new Error("generation returned empty passage");

  return trimmed;
}

function takeWords(text: string, count: number): string {
  const words = text.split(/\s+/);
  return words.length <= count ? text : words.slice(0, count).join(" ");
}

function titleFromContent(content: string): string {
  const opening = content.trim().slice(0, 50);
  const lastSpace = opening.lastIndexOf(" ");
  return (lastSpace > 20 ? opening.slice(0, lastSpace) : opening).trim();
}

export async function runPassageProcessing(args: {
  userId: string;
  passageId: string;
  normalizedText: string;
  userTitle: string;
}): Promise<void> {
  // Run metadata and passage generation in parallel
  const [metadata, content] = await Promise.allSettled([
    generateMetadata(takeWords(args.normalizedText, METADATA_SAMPLE_WORDS)),
    generatePassage(args.normalizedText),
  ]);

  if (content.status === "rejected") throw content.reason;

  const meta = metadata.status === "fulfilled" ? metadata.value : null;

  await completePassageProcessing({
    userId: args.userId,
    passageId: args.passageId,
    content: content.value,
    title: meta?.title || args.userTitle || titleFromContent(content.value),
    cefrLevel: meta?.cefrLevel ?? null,
  });
}
