import { z } from "zod";
import { apiErrorResponseSchema } from "@/lib/http/api-response.schema";

export const uploadResultSchema = z.object({
  passageId: z.string(),
  originalLevel: z.string(),
  simplifiedLevel: z.string().nullable(),
  questionCount: z.number(),
}).strict();

export const uploadSuccessResponseSchema = uploadResultSchema;

export type UploadResultDto = z.infer<typeof uploadResultSchema>;
