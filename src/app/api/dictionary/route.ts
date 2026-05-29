import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import { searchDictionaryExact } from "@/lib/db/dictionary-queries";

const dictionaryQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:dictionary",
    createRequestLogContext(request, "GET", "/api/dictionary"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = dictionaryQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((i) => i.path.join(".")) } },
        "Invalid dictionary query rejected",
      );
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const user = await Sentry.startSpan(
      { name: "api:dictionary-authenticate", op: "auth" },
      () => getAuthenticatedUser(),
    );

    const entry = await Sentry.startSpan(
      {
        name: "db:dictionary-exact-search",
        op: "db",
        attributes: {
          "db.operation": "findFirst",
          "db.model": "DictionaryEntry",
          "dictionary.query_length": parsed.data.q.length,
          "user.id": user.id,
        },
      },
      () => searchDictionaryExact({
        term: parsed.data.q,
        sourceLanguage: parsed.data.sourceLanguage,
        targetLanguage: parsed.data.targetLanguage,
      }),
    );

    requestLog.info(
      {
        context: {
          queryLength: parsed.data.q.length,
          found: entry !== null,
          entryId: entry?.id,
        },
      },
      "Dictionary search completed",
    );

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Dictionary search failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary", method: "GET" },
    });
    return NextResponse.json({ error: "Dictionary search failed." }, { status: 500 });
  }
}
