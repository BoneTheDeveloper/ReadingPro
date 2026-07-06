import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";
import { executeTranslate } from "@/server/modules/translation/inline/inline-translate.service";

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
  const requestLog = createRequestLogger(
    "api:translate",
    createRequestLogContext(request, "POST", "/api/translate"),
  );

  try {
    let body: unknown;
    try {
      body = await Sentry.startSpan(
        { name: "api:translate-parse-body", op: "http.server" },
        () => request.json(),
      );
    } catch {
      requestLog.warn("Invalid JSON payload received for translation");
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const parsed = translateRequestSchema.safeParse(body);
    if (!parsed.success) {
      requestLog.warn(
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
    requestLog.child({
      sourceId: input.sourceId,
      targetLanguage: input.targetLanguage,
    });

    const userId = await Sentry.startSpan(
      {
        name: "api:translate-authenticate",
        op: "auth",
        attributes: { "translation.source_id": input.sourceId },
      },
      () => getUserId(),
    );

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
        requestLog: requestLog.child({ userId: userId }),
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
      requestLog.warn("Unauthenticated translation request rejected");
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    requestLog.error({ err: error }, "Translation request failed");
    Sentry.captureException(error, {
      tags: { route: "api:translate", method: "POST" },
    });
    return NextResponse.json(
      { error: "Unable to translate the selection." },
      { status: 500 },
    );
  }
}
