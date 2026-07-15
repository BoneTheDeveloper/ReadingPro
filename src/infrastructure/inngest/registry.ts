/**
 * Inngest job registry.
 * Central registry for all feature jobs.
 *
 * Usage:
 *   import { inngestFunctions } from "@/infrastructure/inngest/registry";
 *
 *   // In app/api/inngest/route.ts:
 *   import { serve } from "inngest/next";
 *   import { inngest } from "@/infrastructure/inngest/client";
 *   import { inngestFunctions } from "@/infrastructure/inngest/registry";
 *
 *   export const { GET, POST, PUT } = serve({ client: inngest, functions: inngestFunctions });
 */

import { uploadJobs } from "@/features/upload/server/jobs";
import { studioPanelJobs } from "@/features/studio-panel/server/jobs";

// Merge all feature jobs into single array
export const inngestFunctions = [
  ...uploadJobs,
  ...studioPanelJobs,
];
