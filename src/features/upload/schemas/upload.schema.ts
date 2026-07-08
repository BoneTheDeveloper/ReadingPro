import { z } from "zod";

export const uploadResultSchema = z
  .object({
    passageId: z.string(),
    originalLevel: z.string(),
    simplifiedLevel: z.string().nullable(),
    questionCount: z.number(),
  })
  .strict();

export const uploadSuccessResponseSchema = uploadResultSchema;

export type UploadResultDto = z.infer<typeof uploadResultSchema>;
