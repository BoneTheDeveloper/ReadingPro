import { NextRequest, NextResponse } from "next/server";
import { removeItemFromVocabularySet } from "@/features/vocabulary/services/vocabulary-sets.service";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";

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
    return toHttp(error, requestLog, "api:vocabulary:sets:remove-item");
  }
}
