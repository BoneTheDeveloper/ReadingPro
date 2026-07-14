import { z } from "zod";

export const apiErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    code: z.string().optional(),
  })
  .strict();

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function makeSuccessEnvelopeSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  }).strict();
}

/**
 * Factory to create API response contracts (success envelope + error envelope).
 * Usage:
 *   const translateResponseSchema = makeApiResponseSchema(translationDataSchema);
 */
export function makeApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion("success", [
    makeSuccessEnvelopeSchema(dataSchema),
    apiErrorResponseSchema,
  ]);
}
