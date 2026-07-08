import { z } from "zod";

export const uploadResultSchema = z
  .object({
    passageId: z.string(),
    cefrLevel: z.string(),
    questionCount: z.number(),
  })
  .strict();

export const uploadSuccessResponseSchema = uploadResultSchema;

export type UploadResultDto = z.infer<typeof uploadResultSchema>;
