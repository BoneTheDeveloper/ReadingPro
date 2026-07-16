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

/** File uploads are the subset that carry a binary file (derived, not re-typed). */
const fileSourceTypeSchema = uploadSourceTypeSchema.extract(["txt", "pdf"]);

/** `uploadFileAction` FormData fields (parsed after the File itself). */
export const uploadFileRequestSchema = z
  .object({
    passageId: z.string().uuid(),
    title: z.string().min(1),
    sourceType: fileSourceTypeSchema,
    startedAt: z.coerce.number(),
  })
  .strict();

/** `uploadTextAction` pasted-text input. */
export const uploadTextRequestSchema = z
  .object({
    passageId: z.string().uuid(),
    title: z.string().min(1),
    text: z.string().min(1),
    startedAt: z.number(),
  })
  .strict();
