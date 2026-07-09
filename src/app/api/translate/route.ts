import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { withRoute } from "@/lib/http/with-route";
import { executeTranslate } from "@/features/reading/services/inline-translate.service";

const SINGLE_WORD_REGEX = /^[A-Za-z]+(?:[-'][A-Za-z]+)*$/;

const translateRequestSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(SINGLE_WORD_REGEX, "Only a single word is allowed."),
    context: z.string().trim().min(1).max(2000),
    sourceId: z.string().uuid(),
    sourceLanguage: z.literal("en"),
    targetLanguage: z.literal("vi"),
    clientMetrics: z
      .object({
        wordsBeforeSelected: z.number().int().nonnegative().optional(),
      })
      .optional(),
  })
  .strict();

export const POST = withRoute("api:translate", "/api/translate")(
  async (req: NextRequest, _ctx, log) => {
    const body = await req.json();
    const input = translateRequestSchema.parse(body);

    const userId = await getUserId();

    const result = await executeTranslate(
      {
        text: input.text,
        context: input.context,
        sourceId: input.sourceId,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
      },
      {
        userId,
        log: log.child({ userId }),
      },
    );

    if (!result.ok) {
      return Response.json(
        { success: false, error: "Source not found." },
        { status: result.status },
      );
    }

    return Response.json({ success: true, data: result.data });
  },
);
