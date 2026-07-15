import { z } from "zod";

// =============================================================================
// INPUT — client sends this (validated in routes/actions)
// =============================================================================

export const translateInputSchema = z
  .object({
    text: z.string().min(1),
    context: z.string(),
    sourceId: z.string().uuid(),
    sourceLanguage: z.literal("en"),
    targetLanguage: z.literal("vi"),
  })
  .strict();

export type TranslateInput = z.infer<typeof translateInputSchema>;

// =============================================================================
// OUTPUT — server returns this (DTO)
// =============================================================================

export interface TranslationDto {
  translation: string;
  type: string | null;
  provider: "cache" | "dictionary" | "fallback" | "google_translate" | "ai";
}

export function toTranslationDto(data: {
  translation: string;
  type: string | null;
  provider: "cache" | "dictionary" | "fallback" | "google_translate" | "ai";
}): TranslationDto {
  return {
    translation: data.translation,
    type: data.type,
    provider: data.provider,
  };
}

// =============================================================================
// SHARED TYPES — not schemas, used across features
// =============================================================================

export interface TranslationSelection {
  selectedText: string;
  selectionRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  actionRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  contextSentence: string;
  sourceId: string;
  targetLanguage: "vi";
  clientMetrics?: {
    wordsBeforeSelected: number;
  };
}

export type QuickTranslationData = TranslationDto;
