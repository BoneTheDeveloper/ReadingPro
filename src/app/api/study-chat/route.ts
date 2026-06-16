import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { AuthenticationRequiredError, getAuthenticatedUser } from "@/server/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/server/core/logger";
import {
  studyChatRequestSchema,
  studyChatQuerySchema,
  type UiMessage,
} from "@/shared/study/chat-schema";
import { validateMessageSizeLimits } from "@/server/modules/study/chat/chat-utils";
import {
  StudyChatServiceError,
  getOwnedPassageForChat,
  loadPersistedMessages,
  toPersistedUiMessages,
  persistUserMessage,
  streamStudyChat,
  getChatHistory,
} from "@/server/modules/study/chat/chat-service";

function isUnauthenticatedError(error: unknown) {
  return error instanceof AuthenticationRequiredError;
}

export async function POST(request: NextRequest) {
  let requestLog = createRequestLogger(
    "api:study-chat",
    createRequestLogContext(request, "POST", "/api/study-chat"),
  );

  try {
    let body: unknown;
    try {
      body = await Sentry.startSpan(
        {
          name: "api:study-chat-parse-body",
          op: "http.server",
          attributes: { "http.request.method": "POST", "url.path": "/api/study-chat" },
        },
        () => request.json(),
      );
    } catch {
      requestLog.warn("Invalid JSON payload received for study chat");
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const rawMessages =
      typeof body === "object" && body !== null && "messages" in body && Array.isArray(body.messages)
        ? (body.messages as UiMessage[])
        : [];
    const messageLimitsError = validateMessageSizeLimits(rawMessages);

    if (messageLimitsError) {
      requestLog.warn(
        { context: { messageCount: rawMessages.length } },
        "Study chat request exceeded message limits",
      );
      return NextResponse.json({ error: messageLimitsError }, { status: 400 });
    }

    const parsed = studyChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((issue) => issue.path.join(".")) } },
        "Invalid study chat request rejected",
      );
      return NextResponse.json(
        { error: "Invalid chat request. Select a passage and enter a message." },
        { status: 400 },
      );
    }

    const { messages, passageId } = parsed.data;
    requestLog = requestLog.child({ passageId });

    const user = await Sentry.startSpan(
      {
        name: "api:study-chat-authenticate",
        op: "auth",
        attributes: { "study.passage_id": passageId, "study.message_count": messages.length },
      },
      () => getAuthenticatedUser(),
    );
    requestLog = requestLog.child({ userId: user.id });

    const passage = await getOwnedPassageForChat(user.id, passageId);

    const persisted = await loadPersistedMessages(user.id, passageId);
    const persistedUiMessages = toPersistedUiMessages(persisted);

    const userMessage = messages.findLast((msg) => msg.role === "user");
    if (userMessage) {
      await persistUserMessage(user.id, passageId, userMessage);
    }

    const result = await streamStudyChat({
      userId: user.id,
      passageId,
      passage,
      incomingMessages: messages,
      persistedMessages: persistedUiMessages,
      onFinishPersistError: (error) => {
        requestLog.error({ err: error }, "Failed to persist study chat assistant message");
        Sentry.captureException(error, {
          tags: { route: "api:study-chat", method: "POST", operation: "assistant-message-create" },
          extra: { userId: user.id, passageId },
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      requestLog.warn("Unauthenticated study chat request rejected");
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof StudyChatServiceError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    requestLog.error({ err: error }, "Study chat streaming failed");
    Sentry.captureException(error, {
      tags: { route: "api:study-chat", method: "POST" },
    });
    return NextResponse.json(
      { error: "Unable to start the study chat stream." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  let requestLog = createRequestLogger(
    "api:study-chat",
    createRequestLogContext(request, "GET", "/api/study-chat"),
  );

  try {
    const parsed = studyChatQuerySchema.safeParse({
      passageId: request.nextUrl.searchParams.get("passageId"),
    });

    if (!parsed.success) {
      requestLog.warn("Study chat history request missing passageId");
      return NextResponse.json({ error: "A passageId is required." }, { status: 400 });
    }
    requestLog = requestLog.child({ passageId: parsed.data.passageId });

    const user = await Sentry.startSpan(
      {
        name: "api:study-chat-history-authenticate",
        op: "auth",
        attributes: { "study.passage_id": parsed.data.passageId },
      },
      () => getAuthenticatedUser(),
    );
    requestLog = requestLog.child({ userId: user.id });

    const messages = await getChatHistory(user.id, parsed.data.passageId);

    requestLog.debug(
      { context: { messageCount: messages.length } },
      "Loaded study chat history",
    );

    return NextResponse.json({
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: [{ type: "text", text: message.content }],
      })),
    });
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      requestLog.warn("Unauthenticated study chat history request rejected");
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof StudyChatServiceError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    requestLog.error({ err: error }, "Study chat history fetch failed");
    Sentry.captureException(error, {
      tags: { route: "api:study-chat", method: "GET" },
    });
    return NextResponse.json(
      { error: "Unable to load study chat history." },
      { status: 500 },
    );
  }
}
