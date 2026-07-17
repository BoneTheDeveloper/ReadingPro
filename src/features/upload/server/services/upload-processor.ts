/**
 * Upload processing pipeline.
 * Individual functions exported for use by Inngest worker steps.
 */

import "server-only";
import { normalizeText } from "./normalizers/text-normalizer";
import { normalizePdfText } from "./normalizers/pdf-normalizer";
import { detectCefrLevel } from "./analyzers/cefr-detector";
import { extractVocabulary } from "./analyzers/vocabulary-extractor";
import { extractTopics } from "./analyzers/topic-tagger";
import { SourceType } from "@/generated/prisma/enums";

// ---------- Types ----------

export interface UploadProcessorInput {
  jobId: string;
  userId: string;
  passageId: string;
  title: string;
  sourceType: SourceType;
  text?: string; // paste
  blobPath?: string; // txt, pdf
  youtubeUrl?: string; // youtube
  startedAt: number;
}

export interface AnalysisResult {
  cefrLevel: string;
  vocabulary: string[];
  topics: string[];
}


// ---------- Pipeline Steps ----------

/**
 * Resolve text from upload source.
 * This is I/O-bound (file download) — retry is cheap.
 */

/**
 * Normalize text based on source type.
 * This is a pure function — retry has no side effects.
 */
export async function normalizeTextPipeline(
  text: string,
  sourceType: string
): Promise<string> {
  const basicNormalized = await normalizeText(text);
  if (sourceType === "pdf") {
    return normalizePdfText(basicNormalized);
  }
  return basicNormalized;
}

/**
 * Run all content analyzers in parallel.
 * AI call will be here when implemented — retry is expensive.
 */
export async function analyzeContent(text: string): Promise<AnalysisResult> {
  const [cefr, vocab, topics] = await Promise.all([
    detectCefrLevel(text),
    extractVocabulary(text),
    extractTopics(text),
  ]);

  return {
    cefrLevel: cefr.cefrLevel,
    vocabulary: vocab.vocabulary,
    topics: topics.topics,
  };
}

/**
 * Compute word count from text.
 */
export function computeWordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Map upload source type to passage source type.
 */
export function sourceTypeToPassageSourceType(
  sourceType: SourceType
): "TEXT" | "PDF" {
  return sourceType === SourceType.PDF ? "PDF" : "TEXT";
}

// ---------- Convenience Orchestrator ----------

/**
 * Convenience function that orchestrates all pipeline steps.
 * Use this for simple cases; for Inngest, call individual steps.
 */
