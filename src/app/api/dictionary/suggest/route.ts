import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { toHttp } from "@/lib/http/route-errors";
import { normalizeDictionaryTerm } from "@/features/dictionary/lib/normalize-dictionary-term";
import { suggestDictionaryTerms } from "@/features/dictionary/services/suggest-service";

const MODULE = "api:dictionary:suggest";

const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(request: NextRequest) {
  const log = createRequestLogger(
    "api:dictionary-suggest",
    createRequestLogContext(request, "GET", "/api/dictionary/suggest"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = suggestQuerySchema.safeParse(raw);
    if (!parsed.success) {
      log.warn("Invalid suggest query rejected");
      return NextResponse.json(
        { error: "Invalid query parameters." },
        { status: 400 },
      );
    }

    const normalizedQuery = normalizeDictionaryTerm(parsed.data.q);

    if (normalizedQuery.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    await getUserId();

    const merged = await suggestDictionaryTerms(parsed.data.q, {
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguage: parsed.data.targetLanguage,
    });

    log.info(
      {
        context: {
          queryLength: normalizedQuery.length,
          mergedCount: merged.length,
        },
      },
      "Dictionary suggest completed",
    );

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    return toHttp(error, log, MODULE);
  }
}
