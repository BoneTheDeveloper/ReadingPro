import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";
import { resolveDictionaryLookup } from "@/features/dictionary/services/lookup-service";
import type {
  DictionaryEntryDto,
  DictionaryMissDto,
} from "@/features/dictionary/schemas/dictionary-response.schema";

const dictionaryLookupQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:dictionary-lookup",
    createRequestLogContext(request, "GET", "/api/dictionary/lookup"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = dictionaryLookupQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn(
        {
          context: { issues: parsed.error.issues.map((i) => i.path.join(".")) },
        },
        "Invalid dictionary lookup query rejected",
      );
      return NextResponse.json(
        { error: "Invalid query parameters." },
        { status: 400 },
      );
    }

    await Sentry.startSpan(
      { name: "api:dictionary-lookup-authenticate", op: "auth" },
      () => getUserId(),
    );

    const result = (await Sentry.startSpan(
      {
        name: "db:dictionary-lookup",
        op: "db",
        attributes: {
          "dictionary.query_length": parsed.data.q.length,
        },
      },
      () =>
        resolveDictionaryLookup(parsed.data.q, {
          sourceLanguage: parsed.data.sourceLanguage,
          targetLanguage: parsed.data.targetLanguage,
        }),
    )) as DictionaryEntryDto | DictionaryMissDto;

    requestLog.info(
      {
        context: {
          queryLength: parsed.data.q.length,
          found: "found" in result && result.found === false ? false : true,
        },
      },
      "Dictionary lookup completed",
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    requestLog.error({ err: error }, "Dictionary lookup failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-lookup", method: "GET" },
    });
    return NextResponse.json(
      { error: "Dictionary lookup failed." },
      { status: 500 },
    );
  }
}
