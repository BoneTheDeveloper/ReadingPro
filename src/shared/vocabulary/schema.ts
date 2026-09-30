import { z } from "zod";
import { PartOfSpeech, VocabularyStatus } from "@/shared/enums";

/** Two saves are the same word when term and translation match after this. */
const normalizeVocabularyText = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const TermSchema = z.string().trim().min(1).max(80).transform(normalizeVocabularyText);
const TranslationSchema = z.string().trim().min(1).max(200).transform(normalizeVocabularyText);

export const VocabularyInputSchema = z.object({
  term: TermSchema,
  translation: TranslationSchema,
  sourceLanguage: z.literal("en").default("en"),
  targetLanguage: z.literal("vi").default("vi"),
  partofSpeech: z.nativeEnum(PartOfSpeech),
  /* Where the word was met; stored on the first save only. */
  contextSentence: z.string().trim().min(1).max(1000).optional(),
  passageId: z.string().uuid().optional(),
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
  status: z.nativeEnum(VocabularyStatus),
  dueAt: z.coerce.date(),
  contextSentence: z.string().nullable(),
  passageId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;

export const VocabularyListResponseSchema = z.array(VocabularyItemSchema);

/* Edit form — the fields the user can change on a saved vocabulary item.
   Status is absent on purpose: only the review scheduler writes it. */

export const VocabularyUpdateInputSchema = z.object({
  term: TermSchema,
  translation: TranslationSchema,
  partofSpeech: z.nativeEnum(PartOfSpeech),
});

export type VocabularyUpdateInput = z.output<typeof VocabularyUpdateInputSchema>;

export const VocabularyIdParamSchema = z.object({
  id: z.string().uuid(),
});

/* ── Stats: server rollup by status ──────────────── */

export const VocabularyStatusCountsSchema = z.object({
  new: z.number().int().nonnegative(),
  learning: z.number().int().nonnegative(),
  review: z.number().int().nonnegative(),
  relearning: z.number().int().nonnegative(),
});

export type VocabularyStatusCounts = z.infer<typeof VocabularyStatusCountsSchema>;

export const VocabularyStatsSchema = VocabularyStatusCountsSchema.extend({
  total: z.number().int().nonnegative(),
});

export type VocabularyStats = z.infer<typeof VocabularyStatsSchema>;
