---
phase: 4
title: "Implement Upload Analyzers"
status: pending
priority: P2
effort: "2h"
dependencies: ["phase-03-migrate-inngest-infrastructure"]
---

# Phase 4: Implement Upload Analyzers

## Overview

Replace placeholder analyzers in `features/upload/` with real AI-powered implementations:
- `cefr-detector.ts` → AI-based CEFR level detection
- `vocabulary-extractor.ts` → AI-based vocabulary extraction

Job is already moved in Phase 3. This phase implements the actual AI calls and idempotency.

## Requirements

- **Functional**: CEFR detection and vocabulary extraction produce meaningful results
- **Non-functional**: AI calls logged with feature/latency, deduplication enabled

## Architecture

### cefr-detector.ts

```typescript
import { ai } from "@/infrastructure/ai";
import { getModel } from "@/infrastructure/ai/models";
import { withAITrace } from "@/infrastructure/ai/observability";

const cefrSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  reasoning: z.string(),
});

export async function detectCefrLevel(text: string): Promise<CefrResult> {
  const { object } = await withAITrace(
    { operation: "cefr-detection", feature: "upload", model: "structured" },
    () => ai.generateObject({
      model: getModel("structured").modelId,
      schema: cefrSchema,
      system: `You are an expert at determining English CEFR levels.
Analyze the text and determine if it's A1 (beginner), A2 (elementary),
B1 (intermediate), B2 (upper-intermediate), C1 (advanced), or C2 (proficient).
Consider: vocabulary complexity, grammar structures, sentence length, topic sophistication.`,
      prompt: `Determine the CEFR level of this text:\n\n${text}`,
    })
  );

  return { cefrLevel: object.level };
}
```

### vocabulary-extractor.ts

```typescript
import { ai } from "@/infrastructure/ai";
import { getModel } from "@/infrastructure/ai/models";
import { withAITrace } from "@/infrastructure/ai/observability";

const vocabSchema = z.object({
  vocabulary: z.array(z.string()).max(50),
  reasoning: z.string(),
});

export async function extractVocabulary(text: string): Promise<VocabularyResult> {
  const { object } = await withAITrace(
    { operation: "vocab-extraction", feature: "upload", model: "structured" },
    () => ai.generateObject({
      model: getModel("structured").modelId,
      schema: vocabSchema,
      system: `Extract up to 50 important vocabulary words from the text.
Focus on: mid-frequency words, domain-specific terms, useful expressions.
Exclude: very common words (the, a, is, etc.), proper nouns.`,
      prompt: `Extract key vocabulary from:\n\n${text}`,
    })
  );

  return { vocabulary: object.vocabulary };
}
```

## Related Code Files

**Modify:**
- `src/features/upload/server/services/analyzers/cefr-detector.ts`
- `src/features/upload/server/services/analyzers/vocabulary-extractor.ts`
- `src/features/upload/server/jobs/process-upload.ts` (moved from inngest/)

## Implementation Steps

1. **Implement `cefr-detector.ts`**
   - Add imports: `ai`, `getModel`, `withAITrace`, `z`
   - Define Zod schema for CEFR response
   - Implement `detectCefrLevel()` using `ai.generateObject()`
   - Wrap with `withAITrace()` for observability

2. **Implement `vocabulary-extractor.ts`**
   - Add imports: `ai`, `getModel`, `withAITrace`, `z`
   - Define Zod schema for vocabulary response
   - Implement `extractVocabulary()` using `ai.generateObject()`
   - Wrap with `withAITrace()` for observability

3. **Update job `process-upload.ts`**
   - Update `analyzeContent()` to use real analyzers (already called via `analyzeContent()`)
   - Add `deduplicate: true` to job definition
   - Add idempotency check before AI call:
   ```typescript
   const analysis = await step.run("check-existing-analysis", async () => {
     const existing = await prisma.passage.findUnique({
       where: { id: passageId },
       select: { cefrLevel: true }
     });
     if (existing?.cefrLevel) return existing; // Skip if already analyzed
     return analyzeContent(normalized);
   });
   ```

4. **Run tests**

## Success Criteria

- [ ] CEFR detection returns valid level (A1-C2)
- [ ] Vocabulary extraction returns up to 50 words
- [ ] AI calls logged with `{ operation, feature: "upload", model, latencyMs }`
- [ ] Upload job has `deduplicate: true`
- [ ] `pnpm run typecheck` passes
- [ ] Manual test: upload a passage, verify CEFR + vocabulary populated

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI returns invalid CEFR | Low | Medium | Zod schema validation catches bad outputs |
| Token usage high | Medium | Low | Limit text length, use efficient model |
| Duplicate analysis | Low | Medium | Idempotency check before AI call |

## Next Steps

Phase 5: Add question generation job for async quiz generation.
