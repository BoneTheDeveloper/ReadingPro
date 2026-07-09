import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { toHttp } from "@/lib/http/route-errors";
import { executeTranslate } from "@/features/reading/services/inline-translate.service";

const MODULE = "api:translate";

const SINGLE_WORD_REGEX = /^[A-Za-z]+(?:[-'][A-Za-z]+)*$/;

const translateRequestSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1)
      .max(50) // giới hạn an toàn cho 1 từ, tránh input bất thường
      .regex(SINGLE_WORD_REGEX, "Only a single word is allowed."),
    context: z.string().trim().min(1).max(2000), // hoặc bỏ hẳn nếu context cũng không cần giới hạn
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

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(
    "api:translate",
    createRequestLogContext(request, "POST", "/api/translate"),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      log.warn("Invalid JSON payload received for translation");
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const parsed = translateRequestSchema.safeParse(body);
    if (!parsed.success) {
      log.warn(
        {
          context: {
            issues: parsed.error.issues.map((issue) => issue.path.join(".")),
          },
        },
        "Invalid translation request rejected",
      );
      return NextResponse.json(
        { error: "Invalid translation request." },
        { status: 400 },
      );
    }

    const input = parsed.data;
    log.child({
      sourceId: input.sourceId,
      targetLanguage: input.targetLanguage,
    });

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
        userId: userId,
        log: log.child({ userId: userId }),
      },
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: "Source not found." },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    if (isAuthenticationError(error)) {
      log.warn("Unauthenticated translation request rejected");
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    return toHttp(error, log, MODULE);
  }
}
