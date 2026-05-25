import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { createModuleLogger } from "@/lib/core/logger";
import { processFileUpload, UploadWorkflowError } from "@/features/upload/upload-workflow";

const log = createModuleLogger("api:upload");

export async function POST(request: NextRequest) {
  const requestHeaders = request.headers as Headers | undefined;
  const requestUrl = request.nextUrl as URL | undefined;
  const context = {
    requestId: requestHeaders?.get("x-request-id") ?? requestHeaders?.get("x-vercel-id") ?? undefined,
    path: requestUrl?.pathname ?? "/api/upload",
    method: "POST",
  };

  try {
    const user = await getAuthenticatedUser();
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await processFileUpload(user.id, file);

    return NextResponse.json({
      success: true,
      data: {
        filename: result.filename,
        fileUrl: result.fileUrl,
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
    log.error({ err: error, context }, "Upload failed");
    Sentry.captureException(error, {
      tags: { route: "api:upload", method: "POST" },
    });
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 },
    );
  }
}
