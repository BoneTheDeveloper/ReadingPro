import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/middleware/require-session";
import { consumeQuota } from "@/server/modules/subscription";
import { TranslateInputSchema } from "@/shared/reading/schema";
import { translateWord } from "./translate-service";
import type { AuthEnv } from "@/server/env";

// The AI context meaning is a metered Pro feature; Free users read the dictionary.
export const translateRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .post("/", validate("json", TranslateInputSchema), async (c) => {
    await consumeQuota(c.var.user.id, "ai_meaning");
    const translation = await translateWord(c.req.valid("json"));
    return c.json(translation);
  });
