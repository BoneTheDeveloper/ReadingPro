import { z } from "zod";
import { makeResponseSchema } from "@/contracts/http/api-response-schema";

export const passageSourceTypeSchema = z.enum(["TEXT", "PDF", "URL", "YOUTUBE"]);

export const passageSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  originalLevel: z.string().nullable(),
  simplifiedContent: z.string().nullable(),
  simplifiedLevel: z.string().nullable(),
  sourceType: passageSourceTypeSchema,
  wordCount: z.number(),
  createdAt: z.number(),
}).strict();

export const createPassageRequestSchema = z.object({
  text: z.string().min(50, "Text too short (minimum 50 characters)"),
  title: z.string().min(1, "Title is required"),
  sourceType: passageSourceTypeSchema.optional().default("TEXT"),
}).strict();

export const simplifyPassageResponseSchema = z.object({
  simplifiedContent: z.string(),
  simplifiedLevel: z.string(),
}).strict();

export const passageResponseSchema = makeResponseSchema(passageSchema);
export const simplifyPassageActionResponseSchema = makeResponseSchema(simplifyPassageResponseSchema);

export type PassageDto = z.infer<typeof passageSchema>;
export type CreatePassageRequest = z.infer<typeof createPassageRequestSchema>;
export type SimplifyPassageResponse = z.infer<typeof simplifyPassageResponseSchema>;
