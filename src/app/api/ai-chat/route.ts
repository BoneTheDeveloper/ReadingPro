import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getUserId } from "@/lib/auth/auth-server";
import { moduleLog } from "@/lib/logger";
import {
  studyChatRequestSchema,
  type UiMessage,
} from "@/features/studio-panel/schemas/ai-chat";
import { validateMessageSizeLimits } from "@/features/studio-panel/lib/ai-chat-utils";
import {
  getOwnedPassageForChat,
  loadPersistedMessages,
  toPersistedUiMessages,
  persistUserMessage,
  streamStudyChat,
} from "@/features/studio-panel/server/services/ai-chat/ai-chat";

const log = moduleLog("studio-panel:chat-route");

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
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
      { error: "Invalid chat request. Select a passage and enter a message." },
      { status: 400 },
    );
  }

  const { messages, passageId } = parsed.data;
  const userId = await getUserId();

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
      log.error({ err: error, passageId, userId }, "Failed to persist chat message");
      Sentry.captureException(error, {
        tags: { scope: "studio-panel.chat-persist" },
        extra: { passageId, userId },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
