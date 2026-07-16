// features/passage/services/passage.ts
import "server-only";
import { getUserPassages, findOwnedPassage, deletePassage } from "../db/passage";
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
    filePath: p.filePath,
  }));
}

/**
 * Get owned passage with ownership check.
 * Use this instead of directly importing from passage db.
 */
export async function getOwnedPassage(userId: string, passageId: string) {
  return findOwnedPassage(userId, passageId);
}

/**
 * Delete passage with ownership check.
 */
export async function deletePassageById(passageId: string, userId: string) {
  return deletePassage(passageId, userId);
}
