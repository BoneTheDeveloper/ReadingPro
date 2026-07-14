import { z } from "zod";
import {
  VocabularyStatus,
  VocabularySourceType,
  VocabularySetType,
} from "@/generated/prisma/enums";

// Re-export enums for single source of truth
export { VocabularyStatus, VocabularySourceType, VocabularySetType } from "@/generated/prisma/enums";

export const vocabularyStatusSchema = z.nativeEnum(VocabularyStatus);
export const vocabularySourceSchema = z.nativeEnum(VocabularySourceType);
export const vocabularySetTypeSchema = z.nativeEnum(VocabularySetType);

// ---------------------------------------------------------------------------
// Server-action input schemas — validated in vocabulary/actions.ts
// ---------------------------------------------------------------------------

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

export const vocabularyOccurrenceSchema = z.object({
  id: z.string(),
  vocabularyItemId: z.string(),
  sourceId: z.string().nullable(),
  selectedText: z.string(),
  contextSentence: z.string().nullable(),
  createdAt: z.string(),
}).strict();

export const vocabularyItemSchema = z.object({
  id: z.string(),
  normalizedText: z.string(),
  displayText: z.string(),
  type: z.string().nullable(),
  translation: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  status: vocabularyStatusSchema,
  source: z.string(),
  savedCount: z.number(),
  nextReviewAt: z.string().nullable(),
  lastReviewedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  occurrences: z.array(vocabularyOccurrenceSchema),
}).strict();

export const vocabularySetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: vocabularySetTypeSchema,
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({
    items: z.number(),
  }).strict(),
}).strict();

export const vocabularyStatsSchema = z.object({
  total: z.number(),
  new: z.number(),
  learning: z.number(),
  known: z.number(),
}).strict();

export const vocabularyListDataSchema = z.object({
  items: z.array(vocabularyItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
}).strict();

// DTOs - inferred from schema (trusted server output)
export type VocabularyItemDto = z.infer<typeof vocabularyItemSchema>;
export type VocabularySetDto = z.infer<typeof vocabularySetSchema>;
export type VocabularyStatsDto = z.infer<typeof vocabularyStatsSchema>;
