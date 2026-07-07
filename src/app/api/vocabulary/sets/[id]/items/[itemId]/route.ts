import { NextRequest, NextResponse } from "next/server";
import { removeItemFromVocabularySet } from "@/features/vocabulary/services/sets/vocabulary-sets.service";
import { getUserId } from "@/services/clerk";
import {
  isAuthenticationRequiredError,
  isOwnershipMissError,
} from "@/lib/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets:remove-item",
    createRequestLogContext(
      request,
      "DELETE",
      "/api/vocabulary/sets/[id]/items/[itemId]",
    ),
  );

  try {
    const userId = await getUserId();
    const { id, itemId } = await params;

    await removeItemFromVocabularySet({ userId: userId, setId: id, itemId });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (isOwnershipMissError(error, ["vocabulary set", "set"])) {
      return NextResponse.json(
        { error: "Vocabulary set not found." },
        { status: 404 },
      );
    }

    requestLog.error(
      { err: error },
      "Failed to remove item from vocabulary set",
    );
    return NextResponse.json(
      { error: "Failed to remove item from set." },
      { status: 500 },
    );
  }
}
