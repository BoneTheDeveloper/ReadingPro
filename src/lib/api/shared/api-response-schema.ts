import { z } from "zod";

export const apiErrorResponseSchema = z.object({
  error: z.string(),
}).strict();

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function makeSuccessEnvelopeSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  }).strict();
}

export function makePerformanceEnvelopeSchema<T extends z.ZodType, P extends z.ZodType>(dataSchema: T, performanceSchema: P) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    performance: performanceSchema,
  }).strict();
}

export function makeResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.union([makeSuccessEnvelopeSchema(dataSchema), apiErrorResponseSchema]);
}

export function makePerformanceResponseSchema<T extends z.ZodType, P extends z.ZodType>(
  dataSchema: T,
  performanceSchema: P,
) {
  return z.union([
    makeSuccessEnvelopeSchema(dataSchema),
    makePerformanceEnvelopeSchema(dataSchema, performanceSchema),
    apiErrorResponseSchema,
  ]);
}
