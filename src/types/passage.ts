// Single source of truth: the stored passage source type is the Prisma enum
// (TEXT | PDF | YOUTUBE). Type-only import — erased at compile, safe on client.
import type { SourceType } from "@/generated/prisma/client";
export type { SourceType };

export interface PassageData {
  id: string;
  title: string;
  content: string;
  cefrLevel: string | null;
  wordCount: number;
  createdAt: number;
  sourceType: SourceType;
  filePath: string | null;
  youtubeUrl: string | null;
  status?: "processing" | "ready";
}

// Raw Prisma model type for mapping
export type PassageModel = {
  id: string;
  title: string;
  content: string;
  cefrLevel: string | null;
  wordCount: number;
  createdAt: Date;
  sourceType: SourceType;
  filePath: string | null;
  youtubeUrl: string | null;
};

/**
 * Maps raw Prisma record to PassageData.
 * Centralized mapping at the read boundary.
 */
export function toPassageData(row: PassageModel): PassageData {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    cefrLevel: row.cefrLevel,
    wordCount: row.wordCount,
    createdAt: row.createdAt.getTime(),
    sourceType: row.sourceType,
    filePath: row.filePath,
    youtubeUrl: row.youtubeUrl,
    status: "ready",
  };
}
