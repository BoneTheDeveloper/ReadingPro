"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { getChatHistory } from "../services/ai-chat/ai-chat";
import type { StudyChatHistoryDto } from "@/features/studio/schemas/ai-chat";

const passageIdSchema = z.string().uuid();

export async function getChatHistoryAction(passageId: string): Promise<StudyChatHistoryDto["messages"]> {
  const parsedPassageId = passageIdSchema.parse(passageId);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const rows = await getChatHistory(session.user.id, parsedPassageId);
  return rows.map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: row.content }],
  }));
}
