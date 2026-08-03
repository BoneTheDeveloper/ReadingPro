import { z } from "zod";

export const MAX_TEXT_CHARS = 1_000;

export type StudyChatLanguage = "vi" | "en";

const uiMessageTextPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().transform((value) => value.slice(0, MAX_TEXT_CHARS)),
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
  messages: z.array(uiMessageSchema).max(24).default([]),
  passageId: z.string().min(1),
  language: z.enum(["vi", "en"]).default("vi"),
});

const chatHistoryItemSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant"]),
    parts: z.array(uiMessageTextPartSchema).min(1),
  })
  .strict();

export const chatHistoryResponseSchema = z.object({
  messages: z.array(chatHistoryItemSchema),
});

export type ChatHistoryMessage = z.infer<typeof chatHistoryItemSchema>;