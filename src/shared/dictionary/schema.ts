import { z } from "zod";
import { PartOfSpeech } from "@/shared/enums";
import { TranslateInputSchema } from "@/shared/reading/schema";

/** One example sentence under a meaning: English, then its Vietnamese translation. */
const DictionaryExampleSchema = z.object({
  en: z.string(),
  vi: z.string(),
});

const DictionaryMeaningSchema = z.object({
  text: z.string(),
  examples: z.array(DictionaryExampleSchema),
});

/**
 * What a sense group is, which also fixes its display order:
 * - `word`: a part-of-speech group ("danh từ", "ngoại động từ").
 * - `idiom`: a phrase or phrasal verb ("to look after"); `label` is the phrase,
 *   with alternatives joined by " / ".
 * - `domain`: a specialist field ("Chuyên ngành kỹ thuật · điện").
 */
const DictionarySenseSchema = z.object({
  kind: z.enum(["word", "idiom", "domain"]),
  /** The source's own label, e.g. "ngoại động từ lit, lighted"; may be empty. */
  label: z.string(),
  partOfSpeech: z.enum(PartOfSpeech),
  meanings: z.array(DictionaryMeaningSchema),
});

const DictionaryEntrySchema = z.object({
  /** Lowercased lookup key. */
  headword: z.string(),
  displayHeadword: z.string(),
  phonetic: z.string().nullable(),
  senses: z.array(DictionarySenseSchema),
});

export type DictionaryMeaning = z.infer<typeof DictionaryMeaningSchema>;
export type DictionarySense = z.infer<typeof DictionarySenseSchema>;
export type DictionaryEntry = z.infer<typeof DictionaryEntrySchema>;

/** How an entry was reached: the selected word itself, or its base form ("running" → "run"). */
const DictionaryMatchSchema = z.enum(["surface", "lemma"]);

const MatchedDictionaryEntrySchema = DictionaryEntrySchema.extend({
  match: DictionaryMatchSchema,
});
export type MatchedDictionaryEntry = z.infer<typeof MatchedDictionaryEntrySchema>;

/* ── Word lookup API ───────────────────────────────────── */

export const WordLookupInputSchema = z.object({
  passageId: z.string().uuid(),
  word: TranslateInputSchema.shape.word,
  context: z.string().trim().min(1).max(1000).optional(),
});
export type WordLookupInput = z.infer<typeof WordLookupInputSchema>;

export const WordLookupListQuerySchema = z.object({ passageId: z.string().uuid() });
export const WordLookupIdParamSchema = z.object({ id: z.string().uuid() });

/** One row of the "Từ đã tra" list. */
const WordLookupSchema = z.object({
  id: z.string().uuid(),
  passageId: z.string().uuid(),
  headword: z.string(),
  selectedText: z.string(),
  contextSentence: z.string().nullable(),
  lookedUpAt: z.coerce.date(),
  /** The first meaning of the entry, for the row subtitle; null after a reimport dropped the word. */
  summary: z.string().nullable(),
});
export type WordLookup = z.infer<typeof WordLookupSchema>;

export const WordLookupListResponseSchema = z.array(WordLookupSchema);

/** A lookup with its entries: the selected word's own entry and/or its base form, at most two. */
export const WordLookupResultSchema = z.object({
  lookup: WordLookupSchema,
  entries: z.array(MatchedDictionaryEntrySchema),
});
export type WordLookupResult = z.infer<typeof WordLookupResultSchema>;
