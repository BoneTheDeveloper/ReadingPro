import { z } from "zod";

export const MAX_TEXT_CHARS = 1_000;

export type StudyChatLanguage = "vi" | "en";

// AI SDK sends rich part types: text, reasoning (with state), step-start,
// reasonings, step-finish, tool-call, tool-result, tool-result-part, file,
// etc. We only need id/role for DB persistence, so we use passthrough and
// validate the minimal contract.
const uiMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.record(z.string(), z.unknown())).min(1),
});

export const studyChatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).max(24).default([]),
  passageId: z.string().min(1),
  language: z.enum(["vi", "en"]).default("vi"),
});

// Simplified schema for persisted chat history — only text parts are stored.
const chatHistoryTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const chatHistoryItemSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  parts: z.array(chatHistoryTextPartSchema).min(1),
});

export const chatHistoryResponseSchema = z.object({
  messages: z.array(chatHistoryItemSchema),
});

export type ChatHistoryMessage = z.infer<typeof chatHistoryItemSchema>;