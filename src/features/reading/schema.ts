import { z } from "zod";

const PART_OF_SPEECH = [
  "noun", "verb", "adjective", "adverb", "pronoun",
  "preposition", "conjunction", "interjection", "determiner", "unknown",
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH)[number];


export const TranslateInputSchema = z.object({
  word: z.string().trim().min(1).max(40).regex(/^\S+$/),
  context: z.string().trim().min(1).max(1000),
  sourceLanguage: z.literal("en").default("en"),
  targetLanguage: z.literal("vi").default("vi"),
});

export type TranslateInput = z.infer<typeof TranslateInputSchema>;

/* ── Output: model ──────────────────────────────────────── */

export const TranslationOutputSchema = z.object({
  translation: z.string().min(1),
  ipa: z.string().nullable(),
  partOfSpeech: z.enum(PART_OF_SPEECH)
});

export type Translation = z.infer<typeof TranslationOutputSchema>;
