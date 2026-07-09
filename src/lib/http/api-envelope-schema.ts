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

// A helper type to extract the success shape using a plain TypeScript type
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

// 3. Combined Combined API Response Type for your Frontend
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
