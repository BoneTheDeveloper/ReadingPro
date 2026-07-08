import { NextRequest, NextResponse } from "next/server";
import { deleteVocabularyItemById } from "@/features/vocabulary/services/vocabulary-items.service";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = createRequestLogger(
    "api:vocabulary:delete",
    createRequestLogContext(request, "DELETE", "/api/vocabulary/[id]"),
  );

  try {
    const userId = await getUserId();
    const { id } = await params;

    await deleteVocabularyItemById({ userId: userId, itemId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toHttp(error, log, "api:vocabulary:delete");
  }
}
