import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import {
  getVocabularySetList,
  createVocabularyManualSet,
} from "@/features/vocabulary/services/vocabulary-sets.service";

const createSetSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets",
    createRequestLogContext(request, "GET", "/api/vocabulary/sets"),
  );

  try {
    const userId = await getUserId();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;

    const sets = await getVocabularySetList({
      userId: userId,
      type: type as "MANUAL" | "DAILY" | "WEEKLY" | undefined,
    });

    return NextResponse.json({ success: true, data: sets });
  } catch (error) {
    return toHttp(error, requestLog, "api:vocabulary:sets");
  }
}

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets",
    createRequestLogContext(request, "POST", "/api/vocabulary/sets"),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const parsed = createSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const userId = await getUserId();

    const set = await createVocabularyManualSet({
      userId: userId,
      name: parsed.data.name,
    });

    return NextResponse.json({ success: true, data: set });
  } catch (error) {
    return toHttp(error, requestLog, "api:vocabulary:sets");
  }
}
