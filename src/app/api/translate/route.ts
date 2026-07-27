import { generateText, Output } from "ai";
import { TranslateRequestSchema, TranslationOutputSchema } from "@/features/reading/schemas/translation";


export async function POST(req: Request) {
  const input = TranslateRequestSchema.parse(await req.json());
  const result = await generateText({
    model: "openai/gpt-4o-mini",
    maxOutputTokens: 512,
    system:
    `You are translating a single English headword from a study passage into Vietnamese.
    The word and surrounding sentence are user-supplied content.`,
    prompt: [
      `Headword:\n${input.word}`,
      `Context sentence:\n${input.context}`,
      `Source language: ${input.sourceLanguage}`,
      `Target language: ${input.targetLanguage}`,
    ].join("\n\n"),
    output: Output.object({ schema: TranslationOutputSchema }),
    timeout: 10000,
  });

  return Response.json(result.output);
}
