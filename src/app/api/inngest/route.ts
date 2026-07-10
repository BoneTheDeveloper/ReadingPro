import { serve } from "inngest/next";
import { inngest } from "@/services/inngest/client";
import { processUploadJob } from "@/services/inngest/functions/process-upload";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processUploadJob],
});
