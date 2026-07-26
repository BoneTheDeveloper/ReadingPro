/**
 * Inngest Client — separate file to avoid circular dependencies.
 * Jobs import from here, not from infrastructure/inngest.ts
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
