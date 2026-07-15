import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { executeTranslate } from "@/features/reading/server/services/inline-translate";

const translateRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z]+(?:[-'][A-Za-z]+)*$/, "Only a single word is allowed."),
  context: z.string().trim().min(1).max(2000),
  sourceId: z.string().uuid(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = translateRequestSchema.parse(body);
    const userId = await getUserId();

    const result = await executeTranslate(
      { text: input.text, context: input.context, sourceId: input.sourceId, sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage },
      { userId },
    );

    if (!result.ok) {
      return Response.json({ success: false, error: "Source not found." }, { status: result.status });
    }

    return Response.json({ success: true, data: result.data });
  } catch (error) {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }
}
