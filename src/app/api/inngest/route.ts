import { serve } from "inngest/next";
import { inngest } from "@/infrastructure/inngest/client";
import { inngestFunctions } from "@/infrastructure/inngest/registry";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
