import { z } from "zod";
import { getSourceLabel } from "@/features/dictionary/lib/dictionary-helpers";

// =============================================================================
// INPUT — client sends this (validated in actions)
// =============================================================================

export const suggestInputSchema = z
  .object({
    query: z.string().trim().min(1).max(200),
    sourceLanguage: z.literal("en"),
    targetLanguage: z.literal("vi"),
  })
  .strict();

export const entryDetailInputSchema = z
  .object({
    entryId: z.string().uuid(),
    sourceLanguage: z.literal("en"),
    targetLanguage: z.literal("vi"),
  })
  .strict();

// =============================================================================
// OUTPUT — server returns this (DTOs)
// =============================================================================

// Note: These schemas are kept for potential future use (validation, exports)
export const dictionaryTranslationStatusSchema = z.enum([
  "draft",
  "reviewed",
  "approved",
  "deprecated",
]);
export const dictionarySourceTypeSchema = z.enum([
  "seed",
  "manual",
  "provider",
  "llm",
  "mixed",
]);

export interface DictionaryTranslationDto {
  id: string;
  senseId: string;
  targetLanguage: "vi";
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number | null;
  status: z.infer<typeof dictionaryTranslationStatusSchema>;
  sourceType: z.infer<typeof dictionarySourceTypeSchema>;
  sourceName: string | null;
  reviewedAt: string | null;
  sourceLabel: string;
}

export interface DictionarySenseDto {
  id: string;
  partOfSpeech: string | null;
  definition: string | null;
  example: string | null;
  tags: string[];
  usageRank: number;
  translations: DictionaryTranslationDto[];
}

export interface DictionaryEntryDto {
  id: string;
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  senses: DictionarySenseDto[];
}

export interface DictionarySuggestItemDto {
  id: string;
  headword: string;
  matchType: "exact" | "alias" | "prefix" | "phrase";
  matchedAlias: string | null;
  primaryTranslation: string | null;
  sourceLabel: string | null;
}

export interface DictionarySearchResultDto {
  id: string;
  headword: string;
  matchType: "exact" | "alias" | "phrase" | "prefix" | "contains";
  matchedText: string | null;
  primaryTranslation: string | null;
  partOfSpeech: string | null;
  sourceLabel: string | null;
}

// =============================================================================
// MAPPERS — convert internal model to DTO
// =============================================================================

export function buildEntryDto(
  entry: {
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
  },
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
