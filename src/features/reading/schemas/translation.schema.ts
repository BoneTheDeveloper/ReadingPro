import { z } from "zod";
import { apiErrorResponseSchema } from "@/lib/http/api-response.schema";

export const translationDataSchema = z
  .object({
    translation: z.string(),
    type: z.string().nullable(),
    provider: z.enum([
      "cache",
      "dictionary",
      "fallback",
      "google_translate",
      "ai",
    ]),
  })
  .strict();

export type TranslationData = z.infer<typeof translationDataSchema>;

export const translateResponseSchema = translationDataSchema;

export type TranslateResponse = z.infer<typeof translateResponseSchema>;

export const translationErrorResponseSchema = apiErrorResponseSchema;
export type TranslationErrorResponse = z.infer<
  typeof translationErrorResponseSchema
>;

// Shared selection types used across features
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

export type QuickTranslationData = TranslationData;
