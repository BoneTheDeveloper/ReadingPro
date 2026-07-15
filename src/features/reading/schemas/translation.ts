import { z } from "zod";

// Inlined from @/app/api/_lib/api-envelope-schema
const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
}).strict();

function makeApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion("success", [
    z.object({ success: z.literal(true), data: dataSchema }).strict(),
    apiErrorResponseSchema,
  ]);
}

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

type TranslationData = z.infer<typeof translationDataSchema>;

// Response contract: data wrapped in envelope + error envelope
export const translateResponseSchema = makeApiResponseSchema(translationDataSchema);

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
