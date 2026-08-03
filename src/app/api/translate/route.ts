import { withErrorHandling } from "@/lib/error/with-error-handling";
import { TranslateInputSchema } from "@/features/reading/schema";
import { translateWord } from "@/features/reading/server/service/translate";

export const POST = withErrorHandling("translate", async (req) => {
  const input = TranslateInputSchema.parse(await req.json());
  const translation = await translateWord(input);
  return Response.json(translation);
});
