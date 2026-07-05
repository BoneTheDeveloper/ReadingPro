import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getUserId } from "@/server/auth/auth-utils";
import { 
  simplifyPassageForUser, 
  PassageStudyServiceError 
} from "@/server/modules/study/passage/passage-study.service";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import { createModuleLogger } from "@/server/observability/logger";

const log = createModuleLogger("api:study:passages:simplify");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getUserId();
    
    const result = await simplifyPassageForUser(userId, id);

    if ("skipped" in result) {
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (error instanceof PassageStudyServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    Sentry.captureException(error);
    log.error({ error, passageId: id }, "Failed to simplify passage");
    return NextResponse.json(
      { error: "Simplification failed — try again" },
      { status: 500 }
    );
  }
}
