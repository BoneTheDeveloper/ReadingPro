import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { parsePDF } from "@/lib/parsers/pdf";
import {
  validateFile,
  sanitizeFilename,
  sanitizeTitle,
} from "@/lib/validation/upload";
import { analyzeContentAction } from "@/app/actions/analyze";
import { uploadFile, deleteFile } from "@/lib/storage/supabase-storage";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { createModuleLogger } from "@/lib/core/logger";

const log = createModuleLogger("api:upload");

export async function POST(request: NextRequest) {
  let filename = "";
  const storedInStorage = false;

  try {
    const user = await getAuthenticatedUser();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const nameResult = sanitizeFilename(file.name);
    if (!nameResult.valid) {
      return NextResponse.json({ error: nameResult.error }, { status: 400 });
    }

    const timestamp = Date.now();
    filename = `${user.id}/${timestamp}-${nameResult.sanitized}`;

    Sentry.addBreadcrumb({
      category: "upload",
      message: "Uploading file to Supabase Storage",
      level: "info",
    });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const storageResult = await Sentry.startSpan(
      { name: "storage-upload", op: "function" },
      async () => {
        return uploadFile(filename, buffer, file.type);
      },
    );

    if (!storageResult) {
      return NextResponse.json(
        { error: "Failed to store file" },
        { status: 500 },
      );
    }

    let text: string;

    if (file.type === "application/pdf") {
      Sentry.addBreadcrumb({
        category: "parse",
        message: "Parsing PDF file",
        level: "info",
      });
      text = await Sentry.startSpan(
        { name: "pdf-parse", op: "function" },
        async () => {
          const pdf = await parsePDF(buffer);
          return pdf.text;
        },
      );
    } else {
      text = buffer.toString("utf-8");
    }

    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount < 50) {
      await deleteFile(filename).catch(() => {});
      return NextResponse.json(
        { error: "Extracted text is too short (minimum 50 words)" },
        { status: 400 },
      );
    }

    const title = sanitizeTitle(file.name);

    const analyzeFormData = new FormData();
    analyzeFormData.set("text", text);
    analyzeFormData.set("title", title);

    const result = await analyzeContentAction(analyzeFormData);

    if ("error" in result && result.error) {
      await deleteFile(filename).catch(() => {});
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        filename,
        fileUrl: storageResult.url,
        passageId: result.passageId,
        originalLevel: result.originalLevel,
        simplifiedLevel: result.simplifiedLevel,
        questionCount: result.questionCount,
      },
    });
  } catch (error) {
    if (storedInStorage) {
      await deleteFile(filename).catch(() => {});
    }
    log.error({ err: error }, "Upload failed");
    Sentry.captureException(error, {
      tags: { route: "api:upload", method: "POST" },
    });
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 },
    );
  }
}
