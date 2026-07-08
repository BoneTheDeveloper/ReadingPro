import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { toHttp } from "@/lib/http/route-errors";
import { getDictionaryEntryDetail } from "@/features/dictionary/services/entry-detail-service";

const MODULE = "api:dictionary:entry";

const entryIdSchema = z.string().uuid();

const entryDetailQuerySchema = z.object({
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const log = createRequestLogger(
    "api:dictionary-entry-detail",
    createRequestLogContext(request, "GET", "/api/dictionary/entries/:entryId"),
  );

  try {
    const { entryId } = await params;

    const idParsed = entryIdSchema.safeParse(entryId);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid entry id." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = entryDetailQuerySchema.safeParse(raw);
    if (!parsed.success) {
      log.warn(
        {
          context: { issues: parsed.error.issues.map((i) => i.path.join(".")) },
        },
        "Invalid entry detail query rejected",
      );
      return NextResponse.json(
        { error: "Invalid query parameters." },
        { status: 400 },
      );
    }

    await getUserId();

    const dto = await getDictionaryEntryDetail(entryId, {
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguage: parsed.data.targetLanguage,
    });

    if (!dto) {
      log.info({ context: { entryId } }, "Dictionary entry not found");
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    log.info(
      { context: { entryId, found: true } },
      "Dictionary entry detail completed",
    );

    return NextResponse.json({ success: true, data: dto });
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
