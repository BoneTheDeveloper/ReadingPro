import "server-only";
import type { CEFRLevel } from "@/types/cefr";
import { createPassageWithArtifacts } from "../db/content-analysis.repository";

type SourceType = "TEXT" | "PDF";

export interface AnalyzeAndPersistContentInput {
  userId: string;
  text: string;
  title: string;
  sourceType: SourceType;
  filePath?: string;
}

export interface AnalyzeAndPersistContentResult {
  passageId: string;
  cefrLevel: CEFRLevel;
}

export async function analyzeAndPersistContent({
  userId,
  text,
  title,
  sourceType,
  filePath,
}: AnalyzeAndPersistContentInput): Promise<AnalyzeAndPersistContentResult> {
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  const passage = await createPassageWithArtifacts({
    userId,
    title,
    text,
    cefrLevel: "B2", // TODO: replace with AI CEFR detection
    wordCount,
    sourceType,
    filePath,
    artifactId: undefined,
    questions: [],
  });

  return {
    passageId: passage.id,
    cefrLevel: "B2", // TODO: replace with AI CEFR detection
  };
}
