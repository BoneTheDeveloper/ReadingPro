import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import { processFileUpload, UploadWorkflowError } from "@/features/upload/upload-workflow";

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:upload",
    createRequestLogContext(request, "POST", "/api/upload"),
  );

  try {
    const user = await getAuthenticatedUser();
    const formData = await request.formData();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await processFileUpload(user.id, file);

    return NextResponse.json({
      success: true,
      data: {
        passageId: result.passageId,
        originalLevel: result.originalLevel,
        simplifiedLevel: result.simplifiedLevel,
        questionCount: result.questionCount,
      },
    });
  } catch (error) {
    if (error instanceof UploadWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    requestLog.error({ err: error }, "Upload failed");
    Sentry.captureException(error, {
      tags: { route: "api:upload", method: "POST" },
    });
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 },
    );
  }
}
