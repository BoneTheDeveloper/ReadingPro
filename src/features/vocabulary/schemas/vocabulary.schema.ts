import { z } from "zod";
import {
  apiErrorResponseSchema,
  makeSuccessEnvelopeSchema,
} from "@/lib/http/api-envelope-schema";

export const vocabularyStatusSchema = z.enum(["NEW", "LEARNING", "MASTERED"]);
export const vocabularySourceSchema = z.enum(["TRANSLATE", "DICTIONARY"]);
export const vocabularySetTypeSchema = z.enum(["MANUAL", "DAILY", "WEEKLY"]);

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

export const vocabularyListResponseSchema = vocabularyListDataSchema;
export const vocabularySetsResponseSchema = z.array(vocabularySetSchema);
export const vocabularySetResponseSchema = vocabularySetSchema;
export const vocabularyItemResponseSchema = vocabularyItemSchema;
export const vocabularyStatsResponseSchema = vocabularyStatsSchema;
export const vocabularyAckResponseSchema = z.union([
  z.object({ success: z.literal(true) }).strict(),
  apiErrorResponseSchema,
]);

export const vocabularyErrorResponseSchema = apiErrorResponseSchema;

export const vocabularyItemSuccessResponseSchema = makeSuccessEnvelopeSchema(vocabularyItemSchema);

export type VocabularyStatus = z.infer<typeof vocabularyStatusSchema>;
export type VocabularySource = z.infer<typeof vocabularySourceSchema>;
export type VocabularySetType = z.infer<typeof vocabularySetTypeSchema>;
export type VocabularyOccurrenceDto = z.infer<typeof vocabularyOccurrenceSchema>;
export type VocabularyItemDto = z.infer<typeof vocabularyItemSchema>;
export type VocabularySetDto = z.infer<typeof vocabularySetSchema>;
export type VocabularyStatsDto = z.infer<typeof vocabularyStatsSchema>;
export type VocabularyListResponse = z.infer<typeof vocabularyListResponseSchema>;
export type VocabularySetsResponse = z.infer<typeof vocabularySetsResponseSchema>;
export type VocabularySetResponse = z.infer<typeof vocabularySetResponseSchema>;
export type VocabularyItemResponse = z.infer<typeof vocabularyItemResponseSchema>;
export type VocabularyStatsResponse = z.infer<typeof vocabularyStatsResponseSchema>;
export type VocabularyAckResponse = z.infer<typeof vocabularyAckResponseSchema>;
