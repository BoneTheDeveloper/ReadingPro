import { z } from "zod";
import {
  apiErrorResponseSchema,
  makePerformanceEnvelopeSchema,
  makePerformanceResponseSchema,
  makeSuccessEnvelopeSchema,
} from "@/lib/api/shared/api-response-schema";

const dictionaryTranslationStatusSchema = z.enum(["draft", "reviewed", "approved", "deprecated"]);
const dictionarySourceTypeSchema = z.enum(["seed", "manual", "provider", "llm", "mixed"]);

export const dictionaryTranslationSchema = z.object({
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
}).strict();

export const dictionarySenseSchema = z.object({
  id: z.string(),
  partOfSpeech: z.string().nullable(),
  definition: z.string().nullable(),
  example: z.string().nullable(),
  tags: z.array(z.string()),
  usageRank: z.number(),
  translations: z.array(dictionaryTranslationSchema),
}).strict();

export const dictionaryEntrySchema = z.object({
  id: z.string(),
  headword: z.string(),
  sourceLanguage: z.string(),
  frequencyRank: z.number(),
  senses: z.array(dictionarySenseSchema),
}).strict();

export const dictionaryMissSchema = z.object({
  headword: z.string(),
  found: z.literal(false),
}).strict();

export const dictionaryLookupDataSchema = z.union([
  dictionaryEntrySchema,
  dictionaryMissSchema,
]);

export const dictionarySuggestItemSchema = z.object({
  id: z.string(),
  headword: z.string(),
  matchType: z.enum(["exact", "alias", "prefix", "phrase"]),
  matchedAlias: z.string().nullable(),
  primaryTranslation: z.string().nullable(),
  sourceLabel: z.string().nullable(),
}).strict();

export const dictionarySearchResultSchema = z.object({
  id: z.string(),
  headword: z.string(),
  matchType: z.enum(["exact", "alias", "phrase", "prefix", "contains"]),
  matchedText: z.string().nullable(),
  primaryTranslation: z.string().nullable(),
  partOfSpeech: z.string().nullable(),
  sourceLabel: z.string().nullable(),
}).strict();

export const dictionaryPerformanceSchema = z.object({
  queryLength: z.number(),
  normalizedQueryLength: z.number(),
  phase: z.enum(["suggest", "search", "lookup", "entry-detail"]),
  timings: z.object({
    totalMs: z.number(),
    steps: z.record(z.string(), z.number()),
  }).strict(),
  prisma: z.object({
    queryCount: z.number(),
    totalDurationMs: z.number(),
    steps: z.record(z.string(), z.record(z.string(), z.number())),
  }).strict(),
}).strict();

export const dictionaryLookupSuccessResponseSchema = makeSuccessEnvelopeSchema(dictionaryLookupDataSchema);
export const dictionaryLookupPerformanceResponseSchema = makePerformanceEnvelopeSchema(
  dictionaryLookupDataSchema,
  dictionaryPerformanceSchema,
);
export const dictionaryLookupResponseSchema = makePerformanceResponseSchema(
  dictionaryLookupDataSchema,
  dictionaryPerformanceSchema,
);

export const dictionarySearchSuccessResponseSchema = makeSuccessEnvelopeSchema(z.array(dictionarySearchResultSchema));
export const dictionarySearchPerformanceResponseSchema = makePerformanceEnvelopeSchema(
  z.array(dictionarySearchResultSchema),
  dictionaryPerformanceSchema,
);
export const dictionarySearchResponseSchema = makePerformanceResponseSchema(
  z.array(dictionarySearchResultSchema),
  dictionaryPerformanceSchema,
);

export const dictionarySuggestSuccessResponseSchema = makeSuccessEnvelopeSchema(z.array(dictionarySuggestItemSchema));
export const dictionarySuggestPerformanceResponseSchema = makePerformanceEnvelopeSchema(
  z.array(dictionarySuggestItemSchema),
  dictionaryPerformanceSchema,
);
export const dictionarySuggestResponseSchema = makePerformanceResponseSchema(
  z.array(dictionarySuggestItemSchema),
  dictionaryPerformanceSchema,
);

export const dictionaryEntryDetailSuccessResponseSchema = makeSuccessEnvelopeSchema(dictionaryEntrySchema);
export const dictionaryEntryDetailPerformanceResponseSchema = makePerformanceEnvelopeSchema(
  dictionaryEntrySchema,
  dictionaryPerformanceSchema,
);
export const dictionaryEntryDetailResponseSchema = makePerformanceResponseSchema(
  dictionaryEntrySchema,
  dictionaryPerformanceSchema,
);

export const dictionaryErrorResponseSchema = apiErrorResponseSchema;

export type DictionaryTranslationDto = z.infer<typeof dictionaryTranslationSchema>;
export type DictionarySenseDto = z.infer<typeof dictionarySenseSchema>;
export type DictionaryEntryDto = z.infer<typeof dictionaryEntrySchema>;
export type DictionaryMissDto = z.infer<typeof dictionaryMissSchema>;
export type DictionaryLookupResult = z.infer<typeof dictionaryLookupDataSchema>;
export type DictionarySuggestItemDto = z.infer<typeof dictionarySuggestItemSchema>;
export type DictionarySearchResultDto = z.infer<typeof dictionarySearchResultSchema>;
export type DictionaryLookupResponse = z.infer<typeof dictionaryLookupResponseSchema>;
export type DictionarySearchResponse = z.infer<typeof dictionarySearchResponseSchema>;
export type DictionarySuggestResponse = z.infer<typeof dictionarySuggestResponseSchema>;
export type DictionaryEntryDetailResponse = z.infer<typeof dictionaryEntryDetailResponseSchema>;
