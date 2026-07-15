/**
 * Inngest Infrastructure — Unified entry point
 *
 * All exports from one file for simplicity.
 *
 * Usage:
 *   import { inngest, inngestFunctions } from "@/infrastructure/inngest";
 */

import { Inngest } from "inngest";
import { uploadJobs } from "@/features/upload/server/jobs";
import { studioPanelJobs } from "@/features/studio-panel/server/jobs";

// ============================================================================
// Inngest Client
// ============================================================================

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// ============================================================================
// Job Registry
// ============================================================================

export const inngestFunctions = [
  ...uploadJobs,
  ...studioPanelJobs,
];
