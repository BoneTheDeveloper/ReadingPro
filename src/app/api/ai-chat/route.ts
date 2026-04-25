import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  studyChatRequestSchema,
  type UiMessage,
} from "@/features/studio/schema/ai-chat";
import { validateMessageSizeLimits } from "@/features/studio/util/ai-chat";
import {
  loadPersistedMessages,
  toPersistedUiMessages,
  persistUserMessage,
  streamStudyChat,
} from "@/features/studio/server/service/ai-chat";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import {NotFoundError, AppError } from "@/lib/error/app-error";

export const POST = withErrorHandling("ai-chat", async (req) => {
  const session = await requireApiSession();
  const userId = session.user.id;

  const body = await req.json();

  const rawMessages =
    typeof body === "object" &&
    body !== null &&
    "messages" in body &&
    Array.isArray(body.messages)
      ? (body.messages as UiMessage[])
      : [];
  const messageLimitsError = validateMessageSizeLimits(rawMessages);
  if (messageLimitsError) throw new AppError(400, "VALIDATION", messageLimitsError);

  const parsed = studyChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION", "Invalid chat request. Select a passage and enter a message.");
  }

  const { messages, passageId } = parsed.data;

  const passage = await findPassageForUser(userId, passageId);
  if (!passage) throw new NotFoundError("Passage", passageId);

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
  });

  return result.toUIMessageStreamResponse();
});
