import { Inngest } from "inngest";
import { z } from "zod";
import { uploadSourceTypeSchema } from "@/features/upload/schemas/upload.schema";

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Event name constant
export const UPLOAD_PROCESS_EVENT = "upload/process";

// Event payload schema
// The event carries a lightweight "source descriptor". The worker resolves the
// actual text from whichever field matches `sourceType`, so only one of
// `text` / `blobPath` / `url` is populated per event:
//   - paste   → text (inline, safe, no parse)
//   - txt/pdf → blobPath (raw file persisted by the action; worker parses)
//   - youtube → url (transcript fetched by the worker)
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

// Helper to create event payload
export function createUploadProcessEvent(data: UploadProcessEventData) {
  return {
    name: UPLOAD_PROCESS_EVENT,
    data,
  };
}
