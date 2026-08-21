import { NextResponse } from "next/server";
import { type UIMessage, generateId } from "ai";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  chatHistoryResponseSchema,
  MAX_TEXT_CHARS,
  studyChatRequestSchema,
} from "@/features/studio/schema/ai-chat";
import {
  getChatHistoryForUser,
  persistAssistantMessage,
  persistUserMessage,
  resetHistoryForUser,
  streamStudyChat,
} from "@/features/studio/server/service/ai-chat";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { NotFoundError, AppError } from "@/lib/error/app-error";

export const POST = withErrorHandling("ai-chat", async (req) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const userId = auth.session.user.id;

  const body = await req.json();
  const parsed = studyChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      "VALIDATION",
      "Invalid chat request. Select a passage and enter a message.",
    );
  }

  const { messages, passageId, language } = parsed.data;

  const passage = await findPassageForUser(userId, passageId);
  if (!passage) throw new NotFoundError("Passage", passageId);

  // Persist the user turn synchronously so it survives an immediate client
  // abort before the streamed response finishes.
  const latestUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (latestUserMessage) {
    await persistUserMessage(userId, passageId, latestUserMessage as UIMessage);
  }

  const result = await streamStudyChat({
    userId,
    passageId,
    passage: { id: passage.id, content: passage.content, title: passage.title },
    messages: messages as UIMessage[],
    language,
  });

  // AI SDK documented persistence path: save the assistant turn when the
  // stream finishes. Pass originalMessages and generateMessageId for
  // consistent ID generation across client/server.
  return result.toUIMessageStreamResponse({
    originalMessages: messages as UIMessage[],
    generateMessageId: generateId,
    onFinish: ({ responseMessage }) => {
      if (!responseMessage) return;
      void persistAssistantMessage(userId, passageId, responseMessage);
    },
  });
});

export const DELETE = withErrorHandling("ai-chat", async (req) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const userId = auth.session.user.id;

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

export const GET = withErrorHandling("ai-chat", async (req) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const userId = auth.session.user.id;

  const { searchParams } = new URL(req.url);
  const passageId = searchParams.get("passageId");
  if (!passageId) {
    throw new AppError(400, "VALIDATION", "passageId is required");
  }

  const passage = await findPassageForUser(userId, passageId);
  if (!passage) throw new NotFoundError("Passage", passageId);

  const history = await getChatHistoryForUser(userId, passageId);
  const messages = history.map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: row.content.slice(0, MAX_TEXT_CHARS) }],
  }));

  return NextResponse.json(chatHistoryResponseSchema.parse({ messages }));
});