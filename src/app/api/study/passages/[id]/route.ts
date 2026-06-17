import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { deletePassage } from "@/server/db/passage-queries";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import { createModuleLogger } from "@/server/observability/logger";

const log = createModuleLogger("api:study:passages:delete");

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getAuthenticatedUser();
    
    await deletePassage(id, user.id);

    log.info({ passageId: id, userId: user.id }, "Passage deleted via API");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    Sentry.captureException(error);
    log.error({ error, passageId: id }, "Failed to delete passage");
    return NextResponse.json(
      { error: "Failed to delete passage" },
      { status: 500 }
    );
  }
}
