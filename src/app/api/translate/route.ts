import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const input = translateRequestSchema.parse(body);

    const result = await executeTranslate(
      { text: input.text, context: input.context, sourceId: input.sourceId, sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage },
      { userId: session.user.id },
    );

    if (!result.ok) {
      return Response.json({ error: "Source not found." }, { status: result.status });
    }

    return Response.json(result.data);
  } catch (_error) {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }
}
