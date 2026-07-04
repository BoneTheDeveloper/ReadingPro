import "server-only";
import type { UiMessage } from "@/contracts/study/chat-schema";
import {
  MAX_HISTORY_MESSAGES,
  MAX_USER_TEXT_PART_CHARS,
} from "@/contracts/study/chat-schema";

export function truncateToRecentTurns(messages: UiMessage[]): UiMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

export function validateMessageSizeLimits(
  messages: UiMessage[],
): string | null {
  if (messages.length > MAX_HISTORY_MESSAGES) {
    return `Your chat history is too long for one request. Keep the most recent ${MAX_HISTORY_MESSAGES} messages and try again.`;
  }

  for (const message of messages) {
    if (message.role !== "user") continue;

    for (const part of message.parts) {
      if (part.text.length > MAX_USER_TEXT_PART_CHARS) {
        return `One of your messages is too long. Please shorten each message to ${MAX_USER_TEXT_PART_CHARS} characters or less and resend.`;
      }
    }
  }

  return null;
}

export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .filter((part): part is { type: "text"; text: string } => {
      if (!part || typeof part !== "object") return false;
      const candidate = part as { type?: unknown; text?: unknown };
      return candidate.type === "text" && typeof candidate.text === "string";
    })
    .map((part) => part.text)
    .join("\n")
    .trim();
}
