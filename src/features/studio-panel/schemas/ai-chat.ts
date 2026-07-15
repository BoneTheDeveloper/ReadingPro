import { z } from "zod";

// =============================================================================
// INPUT — client sends this (validated in actions/routes)
// =============================================================================

export const uiMessageTextPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string(),
  })
  .strict();

export const uiMessageSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant"]),
    parts: z.array(uiMessageTextPartSchema).min(1),
  })
  .strict();

export const MAX_PASSAGE_CHARS = 50_000;
export const MAX_HISTORY_MESSAGES = 24;
export const MAX_USER_TEXT_PART_CHARS = 2_000;

// No .strict() here: the AI SDK's DefaultChatTransport sends extra fields
// (id, trigger, messageId) alongside the custom body — this route only reads
// `messages`/`passageId`, so extra fields must be allowed through, not rejected.
export const studyChatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
  passageId: z.string().min(1),
});

export const studyChatQuerySchema = z
  .object({
    passageId: z.string().min(1),
  })
  .strict();

// =============================================================================
// OUTPUT — server returns this (DTOs)
// =============================================================================

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
}

export interface StudyChatHistoryDto {
  messages: UiMessage[];
}
