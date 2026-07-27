/**
 * Inngest Job Registry
 */

import { uploadJobs } from "@/features/upload/server/inngest";
import { studioPanelJobs } from "@/features/studio/server/inngest";

export const inngestFunctions = [
  ...uploadJobs,
  ...studioPanelJobs,
];
