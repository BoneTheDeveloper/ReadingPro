import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import {
  processFileUpload,
  UploadWorkflowError,
} from "@/features/upload/db/upload-workflow";

export async function POST(request: NextRequest) {
  const log = createRequestLogger(
    "api:upload",
    createRequestLogContext(request, "POST", "/api/upload"),
  );

  try {
    const userId = await getUserId();
    const formData = await request.formData();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await processFileUpload(userId, file);

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
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return toHttp(error, log, "api:upload");
  }
}
