/**
 * Inngest client singleton.
 *
 * Usage:
 *   import { inngest } from "@/infrastructure/inngest";
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
