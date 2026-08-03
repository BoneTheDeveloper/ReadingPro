import { z } from "zod";


import { PartOfSpeech } from "@/generated/prisma/enums";


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
  partOfSpeech: z.enum(PartOfSpeech)
});

export type Translation = z.infer<typeof TranslationOutputSchema>;
