import { z } from "zod";

export const apiErrorResponseSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
  })
  .strict();

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function makeSuccessEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), data }).strict();
}
export type ApiSuccessResponse<T> = { success: true; data: T };
