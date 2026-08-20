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

const CLEAN_INSTRUCTIONS = `You clean English passages for language learners.

Return only the cleaned passage. No preamble, no commentary, no markdown fences.

Cleaning:
Restore capitalization (sentence starts, proper nouns, "I", acronyms, titles, brands) and terminal punctuation.
Restore apostrophes in contractions and possessives (dont → don't, its vs it's).
Restore paragraph breaks at genuine paragraph starts, separated by one blank line.
Remove spoken-only fillers (um, uh, er) — nothing else.

Constraints:
Never summarize, shorten, expand, translate, or explain. Keep every idea in its original order.
Never invent facts, names, numbers, or sentences.
Keep the author's vocabulary and register. Do not simplify or "upgrade" word choice — learners need authentic English.
Keep unintelligible fragments as-is rather than guessing.`;

const METADATA_INSTRUCTIONS = `You label English passages for language learners.

The text you receive is the OPENING of a longer passage, not the whole passage.
Judge the topic and level from exactly what is there. Never guess at what the rest of the passage contains.
Never invent facts, names, or numbers the text does not state.`;

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

async function cleanContent(text: string): Promise<string> {
  const { text: generated } = await generateText({
    model: MODEL,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    instructions: CLEAN_INSTRUCTIONS,
    prompt: text,
    temperature: 0.2,
  });

  const cleaned = generated.trim();
  if (!cleaned) throw new Error("cleaning pass returned empty text");

  return cleaned;
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
  const [metadata, content] = await Promise.allSettled([
    generateMetadata(takeWords(args.normalizedText, METADATA_SAMPLE_WORDS)),
    cleanContent(args.normalizedText),
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
