import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requirePro } from "@/server/middleware/require-pro";
import { requireSession } from "@/server/middleware/require-session";
import { TranslateInputSchema } from "@/shared/reading/schema";
import { translateWord } from "./translate-service";
import type { AuthEnv } from "@/server/env";

// The AI context meaning is a Pro feature; Free users read the dictionary.
export const translateRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .use(requirePro)
  .post("/", validate("json", TranslateInputSchema), async (c) => {
    const translation = await translateWord(c.req.valid("json"));
    return c.json(translation);
  });
