/**
 * Upload processing pipeline.
 * Individual functions exported for use by Inngest worker steps.
 */

import "server-only";
import { normalizeText } from "./normalizers/text-normalizer.service";
import { normalizePdfText } from "./normalizers/pdf-normalizer.service";
import { detectCefrLevel } from "./analyzers/cefr-detector.service";
import { extractVocabulary } from "./analyzers/vocabulary-extractor.service";
import { extractTopics } from "./analyzers/topic-tagger.service";

// ---------- Types ----------

export interface UploadProcessorInput {
  jobId: string;
  userId: string;
  passageId: string;
  title: string;
  sourceType: "paste" | "txt" | "pdf" | "youtube";
  text?: string; // paste
  blobPath?: string; // txt, pdf
  url?: string; // youtube
  startedAt: number;
}

export interface AnalysisResult {
  cefrLevel: string;
  vocabulary: string[];
  topics: string[];
}

export interface ProcessedContent {
  content: string;
  wordCount: number;
  passageSourceType: "TEXT" | "PDF";
  cefrLevel: string;
  vocabulary: string[];
  topics: string[];
}

// ---------- Pipeline Steps ----------

/**
 * Resolve text from upload source.
 * This is I/O-bound (file download) — retry is cheap.
 */
export async function resolveText(
  sourceType: string,
  text: string | undefined,
  blobPath: string | undefined
): Promise<string> {
  switch (sourceType) {
    case "paste":
      return text ?? "";

    case "txt":
    case "pdf": {
      // blobPath download is done in the Inngest step
      // This function just returns the already-downloaded content
      if (!blobPath) {
        throw new Error(`Missing blobPath for ${sourceType} upload`);
      }
      // Content should be passed from the step that downloaded it
      return text ?? "";
    }

    case "youtube":
      throw new Error("YouTube upload not implemented");

    default:
      throw new Error(`Unsupported sourceType: ${sourceType}`);
  }
}

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
  sourceType: string
): "TEXT" | "PDF" {
  return sourceType === "pdf" ? "PDF" : "TEXT";
}

// ---------- Convenience Orchestrator ----------

/**
 * Convenience function that orchestrates all pipeline steps.
 * Use this for simple cases; for Inngest, call individual steps.
 */
export async function processUpload(
  input: UploadProcessorInput,
  resolvedText: string
): Promise<ProcessedContent> {
  // Validate
  if (!resolvedText.trim()) {
    throw new Error("Resolved text is empty");
  }

  // Normalize
  const normalized = await normalizeTextPipeline(resolvedText, input.sourceType);

  // Analyze
  const analysis = await analyzeContent(normalized);

  // Compute
  const wordCount = computeWordCount(normalized);
  const passageSourceType = sourceTypeToPassageSourceType(input.sourceType);

  return {
    content: normalized,
    wordCount,
    passageSourceType,
    cefrLevel: analysis.cefrLevel,
    vocabulary: analysis.vocabulary,
    topics: analysis.topics,
  };
}
