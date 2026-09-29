import { sourceCleaners, coreNormalize } from "./normalizer";
import { extractVideoId } from "@/shared/passage/youtube-url";
import { fetchTranscript } from "./youtube-transcript";
import { AppError } from "@/server/lib/errors";
import type { CreatePassageInput } from "@/shared/passage/schema";


export interface PreprocessedText {
  normalized: string;
  isFromYouTube: boolean;
}


async function extractRawText(input: CreatePassageInput): Promise<string> {
  if (input.sourceType === "YOUTUBE") {
    const videoId = extractVideoId(input.youtubeUrl);
    if (!videoId) {
      throw new AppError("youtube.url_invalid", "YouTube URL is invalid");
    }

    const transcript = await fetchTranscript(videoId);
    if (!transcript) {
      throw new AppError("youtube.no_transcript", "Video has no transcript");
    }

    return transcript;
  }

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
