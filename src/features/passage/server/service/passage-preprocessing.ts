import { sourceCleaners, coreNormalize } from "@/features/passage/util/normalizer";
import { fetchTranscript, extractVideoId } from "@/features/passage/util/youtube-helper";
import { TEXT_INPUT_LIMITS, YOUTUBE_ERRORS } from "@/features/passage/util/upload-config";
import { AppError } from "@/lib/error/app-error";
import type { CreatePassageInput } from "@/features/passage/schema";


export interface PreprocessedText {
  normalized: string;
  isFromYouTube: boolean;
}


async function extractRawText(input: CreatePassageInput): Promise<string> {
  if (input.sourceType === "YOUTUBE") {
    const videoId = extractVideoId(input.youtubeUrl);
    if (!videoId) {
      throw new AppError(400, "VALIDATION", YOUTUBE_ERRORS.URL_INVALID);
    }

    const transcript = await fetchTranscript(videoId);
    if (!transcript) {
      throw new AppError(400, "VALIDATION", YOUTUBE_ERRORS.NO_TRANSCRIPT);
    }

    return transcript;
  }

  return input.text;
}


function validatePreprocessedText(text: string): void {
  if (text.length < TEXT_INPUT_LIMITS.MIN_LENGTH) {
    throw new AppError(400, "VALIDATION", "Nội dung quá ngắn");
  }
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

  // Stage 4: Validate
  validatePreprocessedText(normalized);

  return {
    normalized,
    isFromYouTube: input.sourceType === "YOUTUBE",
  };
}

export function prepareForAIProcessing(normalizedText: string): string {
  return normalizedText.slice(0, TEXT_INPUT_LIMITS.MAX_LENGTH);
}
