import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { TranslateInputSchema } from "@/shared/reading/schema";
import { translateWord } from "./translate-service";
import type { AppEnv } from "@/server/env";

export const translateRoutes = new Hono<AppEnv>()
  .post("/", validate("json", TranslateInputSchema), async (c) => {
    const translation = await translateWord(c.req.valid("json"));
    return c.json(translation);
  });
