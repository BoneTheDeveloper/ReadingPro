import "server-only";
import { randomUUID } from "node:crypto";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import prisma from "@/lib/prisma";
import {
  MAX_TEXT_CHARS,
  STUDY_CHAT_MODEL,
  STUDY_CHAT_SYSTEM_PROMPT,
} from "@/features/studio/util/chat-config";

export async function resetHistoryForUser(userId: string, passageId: string) {
  await prisma.studyChatMessage.deleteMany({
    where: { userId, passageId },
  });
}

function extractAssistantText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function streamStudyChat(params: {
  userId: string;
  passageId: string;
  passage: { id: string; content: string; title: string };
  messages: UIMessage[];
}) {
  const { userId, passageId, passage, messages } = params;

  const history = await prisma.studyChatMessage.findMany({
    where: { userId, passageId },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  });
  const historyMessages = history.map((msg, index) => ({
    id: `history-${index}`,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content.slice(0, MAX_TEXT_CHARS) }],
  }));

  const passageContext = `
Passage title: ${passage.title}
Passage ID: ${passage.id}

Passage content:
${passage.content.slice(0, MAX_TEXT_CHARS)}
  `.trim();

  const combined = [...historyMessages, ...messages];
  const modelMessages = await convertToModelMessages(combined);

  return streamText({
    model: STUDY_CHAT_MODEL,
    system: STUDY_CHAT_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Selected passage context:\n${passageContext}` },
      ...modelMessages,
    ],
    temperature: 0.4,
  });
}

export async function persistAssistantMessage(
  userId: string,
  passageId: string,
  message: UIMessage,
) {
  const text = extractAssistantText(message);
  if (!text) return;

  await prisma.studyChatMessage.create({
    data: { userId, passageId, role: "assistant", content: text },
  });
}

export const generateMessageId = () => randomUUID();
