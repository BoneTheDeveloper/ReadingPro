import { Hono } from "hono";
import { type UIMessage, generateId } from "ai";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/modules/auth/require-session";
import {
  chatHistoryResponseSchema,
  MAX_TEXT_CHARS,
  studyChatRequestSchema,
} from "@/shared/studio/chat";
import {
  getChatHistoryForUser,
  persistAssistantMessage,
  persistUserMessage,
  resetHistoryForUser,
  streamStudyChat,
} from "./ai-chat";
import { requireOwnedPassage } from "@/server/modules/passage";
import { AppError } from "@/server/lib/errors";
import type { AuthEnv } from "@/server/env";

export const aiChatRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .post(
    "/",
    validate("json", studyChatRequestSchema, "chat.invalid_request"),
    async (c) => {
      const userId = c.var.user.id;
      const { messages, passageId, language } = c.req.valid("json");

      const passage = await requireOwnedPassage(userId, passageId);

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
    },
  )
  .delete("/", async (c) => {
    const userId = c.var.user.id;

    const passageId = c.req.query("passageId");
    if (!passageId) {
      throw new AppError("request.invalid", "passageId is required");
    }

    await requireOwnedPassage(userId, passageId);

    await resetHistoryForUser(userId, passageId);
    return c.body(null, 204);
  })
  .get("/", async (c) => {
    const userId = c.var.user.id;

    const passageId = c.req.query("passageId");
    if (!passageId) {
      throw new AppError("request.invalid", "passageId is required");
    }

    await requireOwnedPassage(userId, passageId);

    const history = await getChatHistoryForUser(userId, passageId);
    const messages = history.map((row) => ({
      id: row.id,
      role: row.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: row.content.slice(0, MAX_TEXT_CHARS) }],
    }));

    return c.json(chatHistoryResponseSchema.parse({ messages }));
  });
