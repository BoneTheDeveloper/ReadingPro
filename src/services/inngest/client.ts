import { Inngest } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Event name constant
export const UPLOAD_PROCESS_EVENT = "upload/process";

// Event payload schema
export const uploadProcessEventSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  blobPath: z.string().optional(),
  text: z.string(),
  title: z.string(),
  sourceType: z.enum(["paste", "txt", "pdf", "youtube"]),
  passageId: z.string().uuid(), // Client-provided UUID for stable key
  startedAt: z.number(), // Client timestamp for createdAt ordering
});

export type UploadProcessEventData = z.infer<typeof uploadProcessEventSchema>;

// Helper to create event payload
export function createUploadProcessEvent(data: UploadProcessEventData) {
  return {
    name: UPLOAD_PROCESS_EVENT,
    data,
  };
}
