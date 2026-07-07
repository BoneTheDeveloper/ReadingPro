import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { validateTextContent } from "@/features/upload/lib/upload-validation";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";
import { analyzeAndPersistContent } from "@/features/upload/services/content-analysis.service";

const textUploadSchema = z.object({
  text: z.string().min(1),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:upload:text",
    createRequestLogContext(request, "POST", "/api/upload/text"),
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

    const parsed = textUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 },
      );
    }

    const validation = validateTextContent(parsed.data.text);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const userId = await getUserId();
    const result = await analyzeAndPersistContent({
      userId: userId,
      text: parsed.data.text,
      title: parsed.data.title || "Untitled",
      sourceType: "TEXT",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return toHttp(error, requestLog, "api:upload:text");
  }
}
