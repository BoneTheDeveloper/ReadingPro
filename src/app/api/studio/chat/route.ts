import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { AuthenticationRequiredError, getUserId } from "@/services/clerk";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import {
  studyChatRequestSchema,
  type UiMessage,
} from "@/features/studio-panel/schemas/chat.schema";
import { validateMessageSizeLimits } from "@/features/ai-chat/lib/chat-utils";
import {
  StudyChatServiceError,
  getOwnedPassageForChat,
  loadPersistedMessages,
  toPersistedUiMessages,
  persistUserMessage,
  streamStudyChat,
} from "@/features/ai-chat/services/chat-service";

function isUnauthenticatedError(error: unknown) {
  return error instanceof AuthenticationRequiredError;
}

export async function POST(request: NextRequest) {
  let log = createRequestLogger(
    "api:study:studio:chat",
    createRequestLogContext(request, "POST", "/api/study/studio/chat"),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      log.warn("Invalid JSON payload received for study chat");
      return NextResponse.json(
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
      log.warn(
        { context: { messageCount: rawMessages.length } },
        "Study chat request exceeded message limits",
      );
      return NextResponse.json({ error: messageLimitsError }, { status: 400 });
    }

    const parsed = studyChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      log.warn(
        {
          context: {
            issues: parsed.error.issues.map((issue) => issue.path.join(".")),
          },
        },
        "Invalid study chat request rejected",
      );
      return NextResponse.json(
        {
          error: "Invalid chat request. Select a passage and enter a message.",
        },
        { status: 400 },
      );
    }

    const { messages, passageId } = parsed.data;
    log = log.child({ passageId });

    const userId = await getUserId();
    log = log.child({ userId: userId });

    const passage = await getOwnedPassageForChat(userId, passageId);

    const persisted = await loadPersistedMessages(userId, passageId);
    const persistedUiMessages = toPersistedUiMessages(persisted);

    const userMessage = messages.findLast((msg) => msg.role === "user");
    if (userMessage) {
      await persistUserMessage(userId, passageId, userMessage);
    }

    const result = await streamStudyChat({
      userId: userId,
      passageId,
      passage,
      incomingMessages: messages,
      persistedMessages: persistedUiMessages,
      onFinishPersistError: (error) => {
        log.error(
          { err: error },
          "Failed to persist study chat assistant message",
        );
        Sentry.captureException(error, {
          tags: {
            route: "api:study:studio:chat",
            method: "POST",
            operation: "assistant-message-create",
          },
          extra: { userId: userId, passageId },
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      log.warn("Unauthenticated study chat request rejected");
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (error instanceof StudyChatServiceError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    log.error({ err: error }, "Study chat streaming failed");
    Sentry.captureException(error, {
      tags: { route: "api:study:studio:chat", method: "POST" },
    });
    return NextResponse.json(
      { error: "Unable to start the study chat stream." },
      { status: 500 },
    );
  }
}
