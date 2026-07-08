import { z } from "zod";
import {
  apiErrorResponseSchema,
} from "@/lib/http/api-response.schema";
import { getSourceLabel } from "@/features/dictionary/lib/dictionary-helpers";

const dictionaryTranslationStatusSchema = z.enum([
  "draft",
  "reviewed",
  "approved",
  "deprecated",
]);
const dictionarySourceTypeSchema = z.enum([
  "seed",
  "manual",
  "provider",
  "llm",
  "mixed",
]);

export const dictionaryTranslationSchema = z
  .object({
    id: z.string(),
    senseId: z.string(),
    targetLanguage: z.literal("vi"),
    translation: z.string(),
    isPrimary: z.boolean(),
    rank: z.number(),
    confidence: z.number().nullable(),
    status: dictionaryTranslationStatusSchema,
    sourceType: dictionarySourceTypeSchema,
    sourceName: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    sourceLabel: z.string(),
  })
  .strict();

export const dictionarySenseSchema = z
  .object({
    id: z.string(),
    partOfSpeech: z.string().nullable(),
    definition: z.string().nullable(),
    example: z.string().nullable(),
    tags: z.array(z.string()),
    usageRank: z.number(),
    translations: z.array(dictionaryTranslationSchema),
  })
  .strict();

export const dictionaryEntrySchema = z
  .object({
    id: z.string(),
    headword: z.string(),
    sourceLanguage: z.string(),
    frequencyRank: z.number(),
    senses: z.array(dictionarySenseSchema),
  })
  .strict();

export const dictionaryMissSchema = z
  .object({
    headword: z.string(),
    found: z.literal(false),
  })
  .strict();

export const dictionaryLookupDataSchema = z.union([
  dictionaryEntrySchema,
  dictionaryMissSchema,
]);

export const dictionarySuggestItemSchema = z
  .object({
    id: z.string(),
    headword: z.string(),
    matchType: z.enum(["exact", "alias", "prefix", "phrase"]),
    matchedAlias: z.string().nullable(),
    primaryTranslation: z.string().nullable(),
    sourceLabel: z.string().nullable(),
  })
  .strict();

export const dictionarySearchResultSchema = z
  .object({
    id: z.string(),
    headword: z.string(),
    matchType: z.enum(["exact", "alias", "phrase", "prefix", "contains"]),
    matchedText: z.string().nullable(),
    primaryTranslation: z.string().nullable(),
    partOfSpeech: z.string().nullable(),
    sourceLabel: z.string().nullable(),
  })
  .strict();

export const dictionaryLookupResponseSchema = dictionaryLookupDataSchema;
export const dictionarySearchResponseSchema = z.array(dictionarySearchResultSchema);
export const dictionarySuggestResponseSchema = z.array(dictionarySuggestItemSchema);
export const dictionaryEntryDetailResponseSchema = dictionaryEntrySchema;

export const dictionaryErrorResponseSchema = apiErrorResponseSchema;

export type DictionaryTranslationDto = z.infer<
  typeof dictionaryTranslationSchema
>;
export type DictionarySenseDto = z.infer<typeof dictionarySenseSchema>;
export type DictionaryEntryDto = z.infer<typeof dictionaryEntrySchema>;
export type DictionaryMissDto = z.infer<typeof dictionaryMissSchema>;
export type DictionaryLookupResult = z.infer<typeof dictionaryLookupDataSchema>;
export type DictionarySuggestItemDto = z.infer<
  typeof dictionarySuggestItemSchema
>;
export type DictionarySearchResultDto = z.infer<
  typeof dictionarySearchResultSchema
>;
export type DictionaryLookupResponse = z.infer<
  typeof dictionaryLookupResponseSchema
>;
export type DictionarySearchResponse = z.infer<
  typeof dictionarySearchResponseSchema
>;
export type DictionarySuggestResponse = z.infer<
  typeof dictionarySuggestResponseSchema
>;
export type DictionaryEntryDetailResponse = z.infer<
  typeof dictionaryEntryDetailResponseSchema
>;
export type DictionaryErrorResponse = z.infer<
  typeof dictionaryErrorResponseSchema
>;

// ---------------------------------------------------------------------------
// Mappers — build wire DTOs from repository row shapes. Pure functions (no DB /
// server-only APIs) so they stay safe to import from either server or client.
// ---------------------------------------------------------------------------

type EntryWithSenses = {
  id: string;
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  senses?: Array<{
    id: string;
    partOfSpeech: string | null;
    definition: string | null;
    example: string | null;
    tags: string[] | null;
    usageRank: number;
    translations?: Array<{
      id: string;
      senseId: string;
      targetLanguage: string;
      translation: string;
      isPrimary: boolean;
      rank: number;
      confidence: number | null;
      status: string;
      sourceType: string;
      sourceName: string | null;
      reviewedAt: Date | null;
    }>;
  }>;
};

export function buildEntryDto(
  entry: EntryWithSenses,
  targetLanguage: string,
  statuses: readonly string[],
): DictionaryEntryDto {
  const senses: DictionarySenseDto[] = (entry.senses ?? [])
    .map((sense) => {
      const translations = (sense.translations ?? [])
        .filter((t) => statuses.includes(t.status))
        .map(toTranslationDto);

      return {
        id: sense.id,
        partOfSpeech: sense.partOfSpeech,
        definition: sense.definition,
        example: sense.example,
        tags: sense.tags ?? [],
        usageRank: sense.usageRank,
        translations,
      };
    })
    .filter((s) => s.translations.length > 0);

  return {
    id: entry.id,
    headword: entry.headword,
    sourceLanguage: entry.sourceLanguage,
    frequencyRank: entry.frequencyRank,
    senses,
  };
}

export function toTranslationDto(t: {
  id: string;
  senseId: string;
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number | null;
  status: string;
  sourceType: string;
  sourceName: string | null;
  reviewedAt: Date | null;
}): DictionaryTranslationDto {
  return {
    id: t.id,
    senseId: t.senseId,
    targetLanguage: t.targetLanguage as "vi",
    translation: t.translation,
    isPrimary: t.isPrimary,
    rank: t.rank,
    confidence: t.confidence,
    status: t.status as DictionaryTranslationDto["status"],
    sourceType: t.sourceType as DictionaryTranslationDto["sourceType"],
    sourceName: t.sourceName,
    reviewedAt: t.reviewedAt?.toISOString() ?? null,
    sourceLabel: getSourceLabel(t.sourceType, t.sourceName),
  };
}
