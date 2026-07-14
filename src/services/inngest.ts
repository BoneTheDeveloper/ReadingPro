/**
 * Generic Inngest client.
 * Single instance used across the app.
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
