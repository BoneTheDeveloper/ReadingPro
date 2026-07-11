import { z } from "zod";

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
export const uploadFileFieldsSchema = z.object({
  passageId: z.string().uuid(),
  title: z.string().min(1),
  sourceType: fileSourceTypeSchema,
  startedAt: z.coerce.number(),
});
export type UploadFileFields = z.infer<typeof uploadFileFieldsSchema>;

/** `uploadTextAction` pasted-text input. */
export const uploadTextInputSchema = z.object({
  passageId: z.string().uuid(),
  title: z.string().min(1),
  text: z.string().min(1),
  startedAt: z.number(),
});
export type UploadTextInput = z.infer<typeof uploadTextInputSchema>;
