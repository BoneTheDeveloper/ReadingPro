---
phase: 3
title: Create-Pipeline-Orchestrator
status: completed
priority: P2
effort: 1h
dependencies:
  - phase-02-create-placeholder-services
---

# Phase 3: Create-Pipeline-Orchestrator

## Overview

Create `upload-processor.service.ts` that orchestrates all processing stages. This service becomes the single entry point for upload processing, replacing the inline logic in the Inngest worker.

## Requirements

- Functional: Orchestrate all pipeline stages (resolve → normalize → analyze → store)
- Non-functional: Idempotent, testable, error handling

## Architecture

```
upload-processor.service.ts
├── resolveText(input)      → get raw text from source
├── normalizeText(text)      → clean and standardize
├── analyzeContent(text)     → run all analyzers (CEFR, vocab, topics)
├── computeWordCount(text)   → calculate word count
└── processUpload(input)     → main orchestrator
```

## Input/Output Types

```typescript
// Input from Inngest event
interface UploadProcessorInput {
  jobId: string;
  userId: string;
  passageId: string;
  title: string;
  sourceType: "paste" | "txt" | "pdf" | "youtube";
  text?: string;        // paste
  blobPath?: string;    // txt, pdf
  url?: string;         // youtube
  startedAt: number;
}

// Output for passage creation
interface ProcessedPassage {
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
```

## Related Code Files

- Create: `src/features/upload/services/upload-processor.service.ts`

## Implementation Steps

1. **Create types**
   ```typescript
   interface UploadProcessorInput { ... }
   interface ProcessedPassage { ... }
   ```

2. **Implement text resolution**
   ```typescript
   async function resolveText(input: UploadProcessorInput): Promise<string> {
     switch (input.sourceType) {
       case "paste":
         return input.text ?? "";
       case "txt":
       case "pdf":
         if (!input.blobPath) throw new Error("Missing blobPath");
         const buffer = await downloadFile(input.blobPath);
         if (!buffer) throw new Error("Failed to read file");
         if (input.sourceType === "pdf") {
           const parsed = await parsePDF(buffer);
           return parsed.text;
         }
         return buffer.toString("utf-8");
       case "youtube":
         // Placeholder: YouTube not implemented
         throw new Error("YouTube upload not implemented");
     }
   }
   ```

3. **Implement text normalization**
   ```typescript
   async function normalizeText(text: string, sourceType: string): Promise<string> {
     const basicNormalized = await normalizeTextBasic(text);
     if (sourceType === "pdf") {
       return await normalizePdfText(basicNormalized);
     }
     return basicNormalized;
   }
   ```

4. **Implement content analysis**
   ```typescript
   async function analyzeContent(text: string) {
     const [cefr, vocab, topics] = await Promise.all([
       detectCefrLevel(text),
       extractVocabulary(text),
       extractTopics(text),
     ]);
     return { ...cefr, ...vocab, ...topics };
   }
   ```

5. **Implement main orchestrator**
   ```typescript
   export async function processUpload(
     input: UploadProcessorInput
   ): Promise<ProcessedPassage> {
     // 1. Resolve text from source
     const rawText = await resolveText(input);
     if (!rawText.trim()) {
       throw new Error("Resolved text is empty");
     }

     // 2. Normalize
     const content = await normalizeText(rawText, input.sourceType);

     // 3. Analyze (placeholder — returns hardcoded values)
     const analysis = await analyzeContent(content);

     // 4. Compute word count
     const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

     // 5. Map source type
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
   ```

6. **Add helper function**
   ```typescript
   function sourceTypeToPassageSourceType(sourceType: string): "TEXT" | "PDF" {
     return sourceType === "pdf" ? "PDF" : "TEXT";
   }
   ```

## Success Criteria

- [ ] `upload-processor.service.ts` exists
- [ ] `processUpload` function accepts `UploadProcessorInput` and returns `ProcessedPassage`
- [ ] All pipeline stages are called in order: resolve → normalize → analyze → compute
- [ ] YouTube sourceType throws appropriate error
- [ ] Functions from Phase 2 services are imported and used

## Risk Assessment

- **Risk**: Migration to use this service vs current inline worker logic
- **Mitigation**: Phase 4 updates worker to use this service, maintaining backward compat until cutover
