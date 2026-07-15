/**
 * Upload-specific Inngest event definitions.
 * These schemas define the shape of upload events sent to Inngest.
 */

import { z } from "zod";
import { uploadSourceTypeSchema } from "@/features/upload/schemas/upload";

// ---------- Event Name ----------

export const UPLOAD_PROCESS_EVENT = "upload/process" as const;

// ---------- Event Payload Schema ----------

/**
 * Event payload for upload processing.
 * The event carries a lightweight "source descriptor". The worker resolves the
 * actual text from whichever field matches `sourceType`.
 */
export const uploadProcessEventSchema = z
  .object({
    jobId: z.string(),
    userId: z.string(),
    blobPath: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional(),
    title: z.string(),
    sourceType: uploadSourceTypeSchema,
    passageId: z.string().uuid(), // Client-provided UUID for stable key
    startedAt: z.number(), // Client timestamp for createdAt ordering
  })
  .strict();

export type UploadProcessEventData = z.infer<typeof uploadProcessEventSchema>;

// ---------- Event Creator ----------

/**
 * Create an upload/process event payload for inngest.send()
 */
export function createUploadProcessEvent(data: UploadProcessEventData) {
  return {
    name: UPLOAD_PROCESS_EVENT,
    data,
  };
}
