import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { createPassageRecord } from "@/server/modules/upload/passage-create/passage-create.service";
import { createPassageRequestSchema } from "@/shared/study/passage-schema";
import { isAuthenticationRequiredError, getZodErrorMessage } from "@/server/http/route-errors";
import { createModuleLogger } from "@/server/core/logger";

const log = createModuleLogger("api:study:passages");

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    
    const parsed = createPassageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      );
    }

    const passage = await createPassageRecord({
      userId: user.id,
      text: parsed.data.text,
      title: parsed.data.title,
      sourceType: parsed.data.sourceType === "PDF" ? "PDF" : "TEXT",
    });

    log.info({ passageId: passage.id, userId: user.id }, "Passage created via API");

    return NextResponse.json({
      success: true,
      data: passage,
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    Sentry.captureException(error);
    log.error({ error }, "Failed to create passage");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create passage" },
      { status: 500 }
    );
  }
}
