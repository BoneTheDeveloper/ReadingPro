import { z } from "zod";

export const PART_OF_SPEECH = [
  "noun", "verb", "adjective", "adverb", "pronoun",
  "preposition", "conjunction", "interjection", "determiner", "unknown",
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH)[number];

/* ── Input: HTTP body ───────────────────────────────────── */

export const TranslateRequestSchema = z.object({
  text: z.string().trim().min(1).max(40).regex(/^\S+$/, "Select a single word"),
  context: z.string().trim().min(1).max(2000),
  sourceLanguage: z.literal("en").default("en"),
  targetLanguage: z.literal("vi").default("vi"),
});

export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;

/* ── Output: model ──────────────────────────────────────── */

export const TranslationOutputSchema = z.object({
  translation: z.string().min(1),
  ipa: z.string().nullable(),
  partOfSpeech: z.enum(PART_OF_SPEECH),
});

export type TranslationDto = z.infer<typeof TranslationOutputSchema>;

/* ── Result ─────────────────────────────────────────────── */

export type TranslateErrorCode = "cancelled" | "upstream" | "invalid_output";

export type TranslateResult =
  | { ok: true; data: TranslationDto }
  | { ok: false; error: { code: TranslateErrorCode; message: string } };
