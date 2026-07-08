export type SourceType = "TEXT" | "PDF" | "URL" | "YOUTUBE";

export interface PassageData {
  id: string;
  title: string;
  content: string;
  cefrLevel: string | null;
  wordCount: number;
  createdAt: number;
  sourceType: SourceType;
}
