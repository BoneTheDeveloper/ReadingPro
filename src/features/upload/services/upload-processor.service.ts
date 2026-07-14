/**
 * Upload processing pipeline orchestrator.
 * Coordinates all processing stages: resolve text → normalize → analyze → output.
 */

import "server-only";
import { downloadFile } from "@/services/storage";
import { parsePDF } from "@/features/upload/lib/pdf-parsers";
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

export interface ProcessedPassage {
  id: string;
  title: string;
  content: string;
  sourceType: "TEXT" | "PDF";
  wordCount: number;
  cefrLevel: string;
  vocabulary: string[];
  topics: string[];
  filePath?: string;
  createdAt: Date;
}

// ---------- Pipeline ----------

/**
 * Main entry point for upload processing.
 * Orchestrates all stages: resolve → normalize → analyze → output
 */
export async function processUpload(
  input: UploadProcessorInput
): Promise<ProcessedPassage> {
  // Stage 1: Resolve text from source
  const rawText = await resolveText(input);
  if (!rawText.trim()) {
    throw new Error("Resolved text is empty");
  }

  // Stage 2: Normalize text
  const content = await normalizeTextPipeline(rawText, input.sourceType);

  // Stage 3: Analyze content (placeholder — returns hardcoded values)
  const analysis = await analyzeContent(content);

  // Stage 4: Compute word count
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

  // Stage 5: Map source type
  const passageSourceType = sourceTypeToPassageSourceType(input.sourceType);

  return {
    id: input.passageId,
    title: input.title,
    content,
    sourceType: passageSourceType,
    wordCount,
    cefrLevel: analysis.cefrLevel,
    vocabulary: analysis.vocabulary,
    topics: analysis.topics,
    filePath: input.blobPath,
    createdAt: new Date(input.startedAt),
  };
}

/**
 * Resolve text from upload source.
 */
async function resolveText(input: UploadProcessorInput): Promise<string> {
  switch (input.sourceType) {
    case "paste":
      return input.text ?? "";

    case "txt":
    case "pdf": {
      if (!input.blobPath) {
        throw new Error(`Missing blobPath for ${input.sourceType} upload`);
      }
      const buffer = await downloadFile(input.blobPath);
      if (!buffer) {
        throw new Error("Failed to read uploaded file from storage");
      }
      if (input.sourceType === "pdf") {
        const parsed = await parsePDF(buffer);
        return parsed.text;
      }
      return buffer.toString("utf-8");
    }

    case "youtube":
      // Placeholder: YouTube not implemented
      throw new Error("YouTube upload not implemented");

    default:
      throw new Error(`Unsupported sourceType: ${input.sourceType}`);
  }
}

/**
 * Normalize text based on source type.
 */
async function normalizeTextPipeline(
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
 */
async function analyzeContent(text: string) {
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
 * Map upload source type to passage source type.
 */
function sourceTypeToPassageSourceType(
  sourceType: string
): "TEXT" | "PDF" {
  return sourceType === "pdf" ? "PDF" : "TEXT";
}
