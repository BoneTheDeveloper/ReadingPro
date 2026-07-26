import { z } from "zod";

/**
 * Minimal translation contracts.
 *
 * Phase 1 introduces placeholder shapes so the inline-translate route, the
 * selection hook, and the popup can compile. Phase 3 (real provider + cache)
 * and Phase 5 (Studio detail) expand these types.
 */

type SelectionRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ClientMetrics = {
  wordsBeforeSelected: number;
};

export type TranslationSelection = {
  selectedText: string;
  selectionRect: SelectionRect;
  actionRect?: SelectionRect;
  contextSentence: string;
  sourceId: string;
  targetLanguage: "vi";
  clientMetrics: ClientMetrics;
};

export type TranslationDto = {
  translation: string;
  type: "word" | "phrase" | null;
  ipa: string | null;
  provider: "fallback" | "google";
};

// Zod schemas kept for runtime validation in future phases; not exported yet
// because no consumer in Phase 1 imports them.
const TranslationSelectionSchema = z.object({
  selectedText: z.string().min(1),
  selectionRect: z.object({
    top: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  actionRect: z
    .object({
      top: z.number(),
      left: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  contextSentence: z.string(),
  sourceId: z.string().uuid(),
  targetLanguage: z.literal("vi"),
  clientMetrics: z.object({
    wordsBeforeSelected: z.number().int().nonnegative(),
  }),
});

const TranslationDtoSchema = z.object({
  translation: z.string(),
  type: z.enum(["word", "phrase"]).nullable(),
  ipa: z.string().nullable(),
  provider: z.enum(["fallback", "google"]),
});

void TranslationSelectionSchema;
void TranslationDtoSchema;