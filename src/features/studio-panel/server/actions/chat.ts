"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { getChatHistory } from "../services/ai-chat/ai-chat";
import type { StudyChatHistoryDto } from "@/features/studio-panel/schemas/ai-chat";

const passageIdSchema = z.string().uuid();

export async function getChatHistoryAction(passageId: string): Promise<StudyChatHistoryDto["messages"]> {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const userId = await getUserId();
  const rows = await getChatHistory(userId, parsedPassageId);
  return rows.map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: row.content }],
  }));
}
