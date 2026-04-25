import { z } from "zod";


const uiMessageTextPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string(),
  })
  .strict();

const uiMessageSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant"]),
    parts: z.array(uiMessageTextPartSchema).min(1),
  })
  .strict();

export const MAX_PASSAGE_CHARS = 50_000;
export const MAX_HISTORY_MESSAGES = 24;
export const MAX_USER_TEXT_PART_CHARS = 2_000;

export const studyChatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
  passageId: z.string().min(1),
});


export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
}
