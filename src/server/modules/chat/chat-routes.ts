import { Hono } from "hono";
import type { UIMessage } from "ai";
import { validate } from "@/server/lib/validate";
import { AppError } from "@/server/lib/errors";
import { requireSession } from "@/server/modules/auth/require-session";
import { chatHistoryResponseSchema, studyChatRequestSchema } from "@/shared/studio/chat";
import {
  getChatHistoryForUser,
  resetChatHistoryForUser,
  streamStudyChatForUser,
} from "./chat-service";
import type { AuthEnv } from "@/server/env";

function requirePassageIdQuery(passageId: string | undefined): string {
  if (!passageId) throw new AppError("request.invalid", "passageId is required");
  return passageId;
}

export const chatRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .post(
    "/",
    validate("json", studyChatRequestSchema, "chat.invalid_request"),
    async (c) => {
      const { messages, passageId, language } = c.req.valid("json");
      return streamStudyChatForUser({
        userId: c.var.user.id,
        passageId,
        messages: messages as UIMessage[],
        language,
      });
    },
  )
  .delete("/", async (c) => {
    const passageId = requirePassageIdQuery(c.req.query("passageId"));
    await resetChatHistoryForUser(c.var.user.id, passageId);
    return c.body(null, 204);
  })
  .get("/", async (c) => {
    const passageId = requirePassageIdQuery(c.req.query("passageId"));
    const messages = await getChatHistoryForUser(c.var.user.id, passageId);
    return c.json(chatHistoryResponseSchema.parse({ messages }));
  });
