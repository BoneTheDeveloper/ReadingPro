import { z } from "zod";
import { PartOfSpeech, VocabularyStatus } from "@/generated/prisma/enums";

export const VocabularyInputSchema = z.object({
  term: z.string().trim().min(1).max(80),
  translation: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en").default("en"),
  targetLanguage: z.literal("vi").default("vi"),
  partofSpeech: z.nativeEnum(PartOfSpeech),
});

export type VocabularyInput = z.input<typeof VocabularyInputSchema>;
export type VocabularyInputParsed = z.output<typeof VocabularyInputSchema>;

export const VocabularyItemSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  translation: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  partofSpeech: z.nativeEnum(PartOfSpeech),
  learningstatus: z.nativeEnum(VocabularyStatus).default("NEW"),
  createdAt: z.coerce.date(),
});

export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;

export const VocabularyListResponseSchema = z.array(VocabularyItemSchema);

/* Edit form — same fields the user can change on a saved vocabulary item. */

export const VocabularyUpdateInputSchema = z.object({
  term: z.string().trim().min(1).max(80),
  translation: z.string().trim().min(1).max(200),
  partofSpeech: z.nativeEnum(PartOfSpeech),
  learningstatus: z.nativeEnum(VocabularyStatus),
});

export type VocabularyUpdateInput = z.infer<typeof VocabularyUpdateInputSchema>;

export const VocabularyIdParamSchema = z.object({
  id: z.string().uuid(),
});

/* ── Stats: server rollup by learningstatus ──────────────── */

export const VocabularyStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  new: z.number().int().nonnegative(),
  learning: z.number().int().nonnegative(),
  known: z.number().int().nonnegative(),
});

export type VocabularyStats = z.infer<typeof VocabularyStatsSchema>;
