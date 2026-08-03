import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { studyChatRequestSchema } from "@/features/studio/schema/ai-chat";
import { validateMessageSizeLimits } from "@/features/studio/util/chat-config";
import {
  generateMessageId,
  persistAssistantMessage,
  resetHistoryForUser,
  streamStudyChat,
} from "@/features/studio/server/service/ai-chat";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { NotFoundError, AppError } from "@/lib/error/app-error";

export const POST = withErrorHandling("ai-chat", async (req) => {
  const session = await requireApiSession();
  const userId = session.user.id;

  const body = await req.json();
  const parsed = studyChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      "VALIDATION",
      "Invalid chat request. Select a passage and enter a message.",
    );
  }

  const { messages, passageId } = parsed.data;
  const sizeError = validateMessageSizeLimits(messages);
  if (sizeError) throw new AppError(400, "VALIDATION", sizeError);

  const passage = await findPassageForUser(userId, passageId);
  if (!passage) throw new NotFoundError("Passage", passageId);

  const result = await streamStudyChat({
    userId,
    passageId,
    passage: { id: passage.id, content: passage.content, title: passage.title },
    messages,
  });

  return result.toUIMessageStreamResponse({
    generateMessageId,
    onFinish: ({ responseMessage }) => {
      if (!responseMessage) return;
      void persistAssistantMessage(userId, passageId, responseMessage);
    },
  });
});

export const DELETE = withErrorHandling("ai-chat", async (req) => {
  const session = await requireApiSession();
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const passageId = searchParams.get("passageId");
  if (!passageId) {
    throw new AppError(400, "VALIDATION", "passageId is required");
  }

  const passage = await findPassageForUser(userId, passageId);
  if (!passage) throw new NotFoundError("Passage", passageId);

  await resetHistoryForUser(userId, passageId);
  return new NextResponse(null, { status: 204 });
});