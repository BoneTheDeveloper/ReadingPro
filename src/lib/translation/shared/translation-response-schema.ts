import { z } from "zod";
import {
  apiErrorResponseSchema,
  makePerformanceEnvelopeSchema,
  makePerformanceResponseSchema,
  makeResponseSchema,
  makeSuccessEnvelopeSchema,
} from "@/lib/api/shared/api-response-schema";

export const translationDataSchema = z.object({
  translation: z.string(),
  type: z.string().nullable(),
  provider: z.enum(["cache", "dictionary", "fallback", "google_translate", "ai"]),
}).strict();

export type TranslationData = z.infer<typeof translationDataSchema>;

export const translateSuccessResponseSchema = makeSuccessEnvelopeSchema(translationDataSchema);

const translatePerformanceSchema = z.object({
  selectedTextWordCount: z.number(),
  contextWordCount: z.number(),
  wordsBeforeSelected: z.number().nullable(),
  resolutionSource: z.enum(["cache", "dictionary", "phrase", "fallback", "google_translate"]),
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

export const translatePerformanceResponseSchema = makePerformanceEnvelopeSchema(translationDataSchema, translatePerformanceSchema);
export const translateResponseSchema = makePerformanceResponseSchema(translationDataSchema, translatePerformanceSchema);

export type TranslateSuccessResponse = z.infer<typeof translateSuccessResponseSchema>;
export type TranslatePerformanceResponse = z.infer<typeof translatePerformanceResponseSchema>;
export type TranslateResponse = z.infer<typeof translateResponseSchema>;

export const vocabularyDataSchema = z.object({
  id: z.string(),
  selectedText: z.string(),
  translation: z.string(),
  type: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict();

export const vocabularySuccessResponseSchema = makeSuccessEnvelopeSchema(vocabularyDataSchema);
export const vocabularyResponseSchema = makeResponseSchema(vocabularyDataSchema);

export type VocabularySuccessResponse = z.infer<typeof vocabularySuccessResponseSchema>;
export type VocabularyResponse = z.infer<typeof vocabularyResponseSchema>;

export const translationErrorResponseSchema = apiErrorResponseSchema;
export type TranslationErrorResponse = z.infer<typeof translationErrorResponseSchema>;
