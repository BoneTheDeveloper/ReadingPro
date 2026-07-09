import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getUserId } from "@/lib/auth/auth-server";
import { withRoute } from "@/lib/http/with-route";
import {
  studyChatRequestSchema,
  type UiMessage,
} from "@/features/studio-panel/schemas/chat.schema";
import { validateMessageSizeLimits } from "@/features/ai-chat/lib/chat-utils";
import {
  getOwnedPassageForChat,
  loadPersistedMessages,
  toPersistedUiMessages,
  persistUserMessage,
  streamStudyChat,
} from "@/features/ai-chat/services/chat-service";

export const POST = withRoute("api:study:studio:chat", "/api/studio/chat")(
  async (req: NextRequest, _ctx, log) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const rawMessages =
      typeof body === "object" &&
      body !== null &&
      "messages" in body &&
      Array.isArray(body.messages)
        ? (body.messages as UiMessage[])
        : [];
    const messageLimitsError = validateMessageSizeLimits(rawMessages);

    if (messageLimitsError) {
      return Response.json({ error: messageLimitsError }, { status: 400 });
    }

    const parsed = studyChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid chat request. Select a passage and enter a message.",
        },
        { status: 400 },
      );
    }

    const { messages, passageId } = parsed.data;
    const logWithContext = log.child({ passageId });

    const userId = await getUserId();
    const logWithUser = logWithContext.child({ userId });

    const passage = await getOwnedPassageForChat(userId, passageId);

    const persisted = await loadPersistedMessages(userId, passageId);
    const persistedUiMessages = toPersistedUiMessages(persisted);

    const userMessage = messages.findLast((msg) => msg.role === "user");
    if (userMessage) {
      await persistUserMessage(userId, passageId, userMessage);
    }

    const result = await streamStudyChat({
      userId,
      passageId,
      passage,
      incomingMessages: messages,
      persistedMessages: persistedUiMessages,
      onFinishPersistError: (error) => {
        logWithUser.error(
          { err: error },
          "Failed to persist study chat assistant message",
        );
        Sentry.captureException(error, {
          tags: {
            route: "api:study:studio:chat",
            method: "POST",
            operation: "assistant-message-create",
          },
          extra: { userId, passageId },
        });
      },
    });

    return result.toUIMessageStreamResponse();
  },
);
