import { z } from "zod";
import {
  VocabularyStatus,
  VocabularySourceType,
  VocabularySetType,
} from "@/generated/prisma/enums";

export { VocabularyStatus, VocabularySetType } from "@/generated/prisma/enums";

const vocabularyStatusSchema = z.nativeEnum(VocabularyStatus);
const vocabularySourceSchema = z.nativeEnum(VocabularySourceType);

// =============================================================================
// INPUT — client sends this (validated in actions)
// =============================================================================

export const saveVocabularyInputSchema = z
  .object({
    selectedText: z.string().trim().min(1).max(500),
    translation: z.string().trim().min(1).max(500),
    contextSentence: z.string().trim().max(4000).optional(),
    sourceId: z.string().uuid().optional(),
    sourceLanguage: z.literal("en"),
    targetLanguage: z.literal("vi"),
    source: vocabularySourceSchema.default("TRANSLATE"),
    dictionaryEntryId: z.string().uuid().optional(),
    dictionarySenseId: z.string().uuid().optional(),
  })
  .strict();

export const updateVocabularyStatusInputSchema = z
  .object({
    itemId: z.string().uuid(),
    status: vocabularyStatusSchema,
  })
  .strict();

export const reviewVocabularyInputSchema = z
  .object({
    itemId: z.string().uuid(),
    isCorrect: z.boolean(),
  })
  .strict();

export const createVocabularySetInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const updateVocabularySetInputSchema = z
  .object({
    setId: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const deleteVocabularySetInputSchema = z
  .object({
    setId: z.string().uuid(),
  })
  .strict();

export const addItemsToVocabularySetInputSchema = z
  .object({
    setId: z.string().uuid(),
    itemIds: z.array(z.string().uuid()).min(1),
  })
  .strict();

export const removeItemFromVocabularySetInputSchema = z
  .object({
    setId: z.string().uuid(),
    itemId: z.string().uuid(),
  })
  .strict();

// =============================================================================
// OUTPUT — server returns this (DTOs)
// =============================================================================

interface VocabularyOccurrenceDto {
  id: string;
  vocabularyItemId: string;
  sourceId: string | null;
  selectedText: string;
  contextSentence: string | null;
  createdAt: string;
}

export interface VocabularyItemDto {
  id: string;
  normalizedText: string;
  displayText: string;
  type: string | null;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: VocabularyStatus;
  source: string;
  savedCount: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  occurrences: VocabularyOccurrenceDto[];
}

export interface VocabularySetDto {
  id: string;
  name: string;
  type: VocabularySetType;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { setItems: number };
}

export interface VocabularyStatsDto {
  total: number;
  new: number;
  learning: number;
  known: number;
}

// =============================================================================
// MODEL — internal Prisma type (for mappers)
// =============================================================================

export type VocabularyItemModel = {
  id: string;
  normalizedText: string;
  displayText: string;
  type: string | null;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: VocabularyStatus;
  source: string;
  savedCount: number;
  nextReviewAt: Date | null;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  occurrences: Array<{
    id: string;
    vocabularyItemId: string;
    sourceId: string | null;
    selectedText: string;
    contextSentence: string | null;
    createdAt: Date;
  }>;
};

export type VocabularySetModel = {
  id: string;
  name: string;
  type: VocabularySetType;
  periodStart: Date | null;
  periodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { setItems: number };
};

// =============================================================================
// MAPPERS — convert internal model to DTO
// =============================================================================

export function toVocabularyItemDto(model: VocabularyItemModel): VocabularyItemDto {
  return {
    id: model.id,
    normalizedText: model.normalizedText,
    displayText: model.displayText,
    type: model.type,
    translation: model.translation,
    sourceLanguage: model.sourceLanguage,
    targetLanguage: model.targetLanguage,
    status: model.status,
    source: model.source,
    savedCount: model.savedCount,
    nextReviewAt: model.nextReviewAt?.toISOString() ?? null,
    lastReviewedAt: model.lastReviewedAt?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
    occurrences: model.occurrences.map((o) => ({
      id: o.id,
      vocabularyItemId: o.vocabularyItemId,
      sourceId: o.sourceId,
      selectedText: o.selectedText,
      contextSentence: o.contextSentence,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export function toVocabularySetDto(model: VocabularySetModel): VocabularySetDto {
  return {
    id: model.id,
    name: model.name,
    type: model.type,
    periodStart: model.periodStart?.toISOString() ?? null,
    periodEnd: model.periodEnd?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
    _count: { setItems: model._count.setItems },
  };
}
