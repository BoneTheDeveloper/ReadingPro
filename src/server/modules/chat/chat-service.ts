import { convertToModelMessages, generateId, streamText, type UIMessage } from "ai";
import { requireOwnedPassage } from "@/server/modules/passage";
import { MAX_TEXT_CHARS, type StudyChatLanguage } from "@/shared/studio/chat";
import { getStudyChatSystemPrompt } from "./chat-prompts";
import {
  createChatMessage,
  deleteChatHistory,
  listChatHistory,
  type ChatRole,
} from "./chat-repository";

function extractMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function persistMessage(
  userId: string,
  passageId: string,
  role: ChatRole,
  message: UIMessage,
) {
  const text = extractMessageText(message);
  if (!text) return;
  await createChatMessage(userId, passageId, role, text);
}

async function loadHistoryMessages(userId: string, passageId: string) {
  const history = await listChatHistory(userId, passageId);
  return history.map((row) => ({
    id: row.id,
    role: row.role as ChatRole,
    parts: [{ type: "text" as const, text: row.content.slice(0, MAX_TEXT_CHARS) }],
  }));
}

/**
 * Streams the tutor's answer about one passage. The user turn is saved before
 * streaming so it survives a client abort; the assistant turn is saved when the
 * stream finishes.
 */
export async function streamStudyChatForUser(params: {
  userId: string;
  passageId: string;
  messages: UIMessage[];
  language: StudyChatLanguage;
}): Promise<Response> {
  const { userId, passageId, messages, language } = params;
  const passage = await requireOwnedPassage(userId, passageId);

  const latestUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (latestUserMessage) await persistMessage(userId, passageId, "user", latestUserMessage);

  const historyMessages = await loadHistoryMessages(userId, passageId);

  const passageContext = `
Passage title: ${passage.title}
Passage ID: ${passage.id}

Passage content:
${passage.content.slice(0, MAX_TEXT_CHARS)}
  `.trim();

  const modelMessages = await convertToModelMessages([...historyMessages, ...messages]);

  const result = streamText({
    model: "deepseek/deepseek-v4-flash",
    system: getStudyChatSystemPrompt(language),
    messages: [
      { role: "user", content: `Selected passage context:\n${passageContext}` },
      ...modelMessages,
    ],
    temperature: 0.4,
  });

  // AI SDK documented persistence path: originalMessages and generateMessageId
  // keep message ids consistent between client and server.
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: generateId,
    onFinish: ({ responseMessage }) => {
      if (!responseMessage) return;
      void persistMessage(userId, passageId, "assistant", responseMessage);
    },
  });
}

export async function getChatHistoryForUser(userId: string, passageId: string) {
  await requireOwnedPassage(userId, passageId);
  return loadHistoryMessages(userId, passageId);
}

export async function resetChatHistoryForUser(userId: string, passageId: string) {
  await requireOwnedPassage(userId, passageId);
  await deleteChatHistory(userId, passageId);
}
