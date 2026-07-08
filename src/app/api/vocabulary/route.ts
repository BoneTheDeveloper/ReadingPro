import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { toHttp } from "@/lib/http/route-errors";
import {
  VocabularyServiceError,
  saveVocabularyItem,
} from "@/features/vocabulary/services/vocabulary-items.service";

const vocabularyRequestSchema = z.object({
  selectedText: z.string().trim().min(1).max(500),
  translation: z.string().trim().min(1).max(500),
  contextSentence: z.string().trim().max(4000).optional(),
  sourceId: z.string().uuid().optional(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  source: z.enum(["TRANSLATE", "DICTIONARY"]).default("TRANSLATE"),
  dictionaryEntryId: z.string().uuid().optional(),
  dictionarySenseId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  let log = createRequestLogger(
    "api:vocabulary",
    createRequestLogContext(request, "POST", "/api/vocabulary"),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      log.warn("Invalid JSON payload received for vocabulary save");
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const parsed = vocabularyRequestSchema.safeParse(body);
    if (!parsed.success) {
      log.warn(
        {
          context: {
            issues: parsed.error.issues.map((issue) => issue.path.join(".")),
          },
        },
        "Invalid vocabulary request rejected",
      );
      return NextResponse.json(
        { error: "Invalid vocabulary request." },
        { status: 400 },
      );
    }

    const input = parsed.data;
    log = log.child({
      targetLanguage: input.targetLanguage,
      source: input.source,
    });

    const userId = await getUserId();
    log = log.child({ userId: userId });

    const dto = await saveVocabularyItem({ ...input, userId: userId });

    return NextResponse.json({ success: true, data: dto });
  } catch (error) {
    if (error instanceof VocabularyServiceError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return toHttp(error, log, "api:vocabulary");
  }
}
