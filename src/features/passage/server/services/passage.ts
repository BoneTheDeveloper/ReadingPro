// features/passage/services/passage.ts
import "server-only";
import { getUserPassages } from "../db/passage";
import type { PassageData } from "@/types/passage";

export async function listUserPassages(userId: string): Promise<PassageData[]> {
  const rows = await getUserPassages(userId);
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    cefrLevel: p.cefrLevel,
    wordCount: p.wordCount,
    createdAt: p.createdAt.getTime(),
    sourceType: p.sourceType,
  }));
}
