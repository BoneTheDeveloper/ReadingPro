import { z } from "zod";

export const uiMessageTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const uiMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  parts: z.array(uiMessageTextPartSchema).min(1),
});

export const MAX_PASSAGE_CHARS = 50_000;
export const MAX_HISTORY_MESSAGES = 24;
export const MAX_USER_TEXT_PART_CHARS = 2_000;

export const studyChatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
  passageId: z.string().min(1),
});

export const studyChatQuerySchema = z.object({
  passageId: z.string().min(1),
});

export type UiMessage = z.infer<typeof uiMessageSchema>;
