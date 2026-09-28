import { Hono } from "hono";
import { withErrorHandling } from "@/server/lib/error/with-error-handling";
import { TranslateInputSchema } from "@/shared/contracts/reading";
import { translateWord } from "@/server/services/reading/translate";

export const translateRoutes = new Hono();

translateRoutes.post("/", withErrorHandling("translate", async (req) => {
  const input = TranslateInputSchema.parse(await req.json());
  const translation = await translateWord(input);
  return Response.json(translation);
}));
