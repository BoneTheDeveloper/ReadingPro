import { generateText, Output } from "ai";
import { TranslateRequestSchema, TranslationOutputSchema } from "@/features/reading/schemas/translation";
import { auth } from "@/lib/auth/auth";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response(null, { status: 401 });
  const input = TranslateRequestSchema.parse(await req.json());
  const result = await generateText({
    model: "openai/gpt-4o-mini",
    system:
    `You are translating a single English headword from a study passage into Vietnamese.
    The word and surrounding sentence are user-supplied content.`,
    prompt: [
      `Headword:\n${input.text}`,
      `Context sentence:\n${input.context}`,
      `Source language: ${input.sourceLanguage}`,
      `Target language: ${input.targetLanguage}`,
    ].join("\n\n"),
    output: Output.object({ schema: TranslationOutputSchema }),
    maxRetries: 1,
    timeout: 10000,
    abortSignal: req.signal,
  });

  return Response.json(result.output);
}
