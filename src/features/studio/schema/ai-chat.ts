import { z } from "zod";
import { MAX_HISTORY_MESSAGES, MAX_TEXT_CHARS } from "../util/chat-config";

const uiMessageTextPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().max(MAX_TEXT_CHARS),
  })
  .strict();

const uiMessageSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant"]),
    parts: z.array(uiMessageTextPartSchema).min(1),
  })
  .strict();

export const studyChatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
  passageId: z.string().min(1),
});