import { sourceCleaners, coreNormalize } from "./normalizer";
import { requireTranscript } from "./youtube-transcript";
import type { CreatePassageInput } from "@/shared/passage/schema";


export interface PreprocessedText {
  normalized: string;
  isFromYouTube: boolean;
}


async function extractRawText(input: CreatePassageInput): Promise<string> {
  if (input.sourceType === "YOUTUBE") return requireTranscript(input.youtubeUrl);
  return input.text;
}


export async function preprocessPassage(
  input: CreatePassageInput,
): Promise<PreprocessedText> {
  // Stage 1: Extract raw text from source
  const rawText = await extractRawText(input);

  // Stage 2: Source-specific cleaning
  const cleaned = sourceCleaners[input.sourceType](rawText);

  // Stage 3: Universal normalization
  const normalized = coreNormalize(cleaned);

  return {
    normalized,
    isFromYouTube: input.sourceType === "YOUTUBE",
  };
}
