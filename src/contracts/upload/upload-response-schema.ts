import { z } from "zod";
import { makeResponseSchema, makeSuccessEnvelopeSchema } from "@/contracts/http/api-response-schema";

export const uploadResultSchema = z.object({
  passageId: z.string(),
  originalLevel: z.string(),
  simplifiedLevel: z.string().nullable(),
  questionCount: z.number(),
}).strict();

export const uploadSuccessResponseSchema = makeSuccessEnvelopeSchema(uploadResultSchema);
export const uploadResponseSchema = makeResponseSchema(uploadResultSchema);

export type UploadResultDto = z.infer<typeof uploadResultSchema>;
