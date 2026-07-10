export type SourceType = "TEXT" | "PDF" | "URL" | "YOUTUBE";

export interface PassageData {
  id: string;
  title: string;
  content: string;
  cefrLevel: string | null;
  wordCount: number;
  createdAt: number;
  sourceType: SourceType;
  status?: "processing" | "ready";
}

// Raw Prisma row type for mapping
export type PassageRow = {
  id: string;
  title: string;
  content: string;
  cefrLevel: string | null;
  wordCount: number;
  createdAt: Date;
  sourceType: SourceType;
};

/**
 * Maps raw Prisma record to PassageData.
 * Centralized mapping at schema boundary - FR-05b.5 pattern.
 */
export function toPassageData(row: PassageRow): PassageData {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    cefrLevel: row.cefrLevel,
    wordCount: row.wordCount,
    createdAt: row.createdAt.getTime(),
    sourceType: row.sourceType,
    status: "ready",
  };
}
