import { serve } from "inngest/next";
import { inngest } from "@/services/inngest";
import { processUploadJob } from "@/features/upload/server/inngest/process-upload";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processUploadJob],
});
