import { z } from "zod";

// Scope: this file holds upload VOCABULARY + REQUEST schemas only.
// - Output/DTO for the created passage lives in src/types/passage.ts.
// - The async event payload contract lives in services/inngest/client.ts
//   (it imports uploadSourceTypeSchema from here rather than redefining it).

/**
 * Single source of truth for the upload INPUT source vocabulary (how the user
 * provided the content). The inngest event schema and the upload actions all
 * derive from this — no hand-duplicated enums elsewhere.
 */
export const uploadSourceTypeSchema = z.enum(["paste", "txt", "pdf", "youtube"]);
export type UploadSourceType = z.infer<typeof uploadSourceTypeSchema>;

/** File uploads are the subset that carry a binary file (derived, not re-typed). */
export const fileSourceTypeSchema = uploadSourceTypeSchema.extract(["txt", "pdf"]);
export type FileSourceType = z.infer<typeof fileSourceTypeSchema>;

/** `uploadFileAction` FormData fields (parsed after the File itself). */
export const uploadFileRequestSchema = z
  .object({
    passageId: z.string().uuid(),
    title: z.string().min(1),
    sourceType: fileSourceTypeSchema,
    startedAt: z.coerce.number(),
  })
  .strict();
export type UploadFileRequest = z.infer<typeof uploadFileRequestSchema>;

/** `uploadTextAction` pasted-text input. */
export const uploadTextRequestSchema = z
  .object({
    passageId: z.string().uuid(),
    title: z.string().min(1),
    text: z.string().min(1),
    startedAt: z.number(),
  })
  .strict();
export type UploadTextRequest = z.infer<typeof uploadTextRequestSchema>;
