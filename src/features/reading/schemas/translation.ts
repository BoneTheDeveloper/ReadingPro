import { z } from "zod";

const PART_OF_SPEECH = [
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

/* ── Output: model ──────────────────────────────────────── */

export const TranslationOutputSchema = z.object({
  translation: z
    .string()
    .min(1)
    .describe("Vietnamese translation matching how the word is used in the context sentence, not its most common dictionary sense."),
  ipa: z
    .string()
    .nullable()
    .describe("IPA transcription General American (US) for the sense implied by the context. Null if not confident."),
  partOfSpeech: z
    .enum(PART_OF_SPEECH)
    .describe("Part of speech as used in the context sentence. Use 'unknown' if unclear."),
});

export type TranslationDto = z.infer<typeof TranslationOutputSchema>;
