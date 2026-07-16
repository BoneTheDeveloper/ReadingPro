# Upload AI Pipeline

## Overview

AI enrichment of uploaded passages: CEFR detection, vocabulary extraction, topic tagging.

---

## Pipeline Stages

```
Text Input → Normalize → AI Analysis → Metadata Output
```

### 1. Normalize

Clean text before AI analysis.

| Operation | Status |
|-----------|--------|
| Whitespace cleanup | ✅ Done |
| Encoding normalization | ✅ Done |
| Control char removal | ✅ Done |
| PDF artifact removal | ✅ Done |

### 2. AI Analysis

| Analysis | Status | Output |
|----------|--------|--------|
| CEFR level | ⏳ Placeholder | `A1` / `A2` / `B1` / `B2` / `C1` / `C2` |
| Vocabulary | ⏳ Placeholder | Key words list |
| Topics | ⏳ Placeholder | Categories list |

---

## Data Flow

See **[Upload Data Flow](./upload-data-flow.md)** for full context.

The AI pipeline is called from the Inngest worker during the `analyze-content` step.

---

## Output Schema

```typescript
interface AnalysisResult {
  cefrLevel: string;      // Currently "B2" (placeholder)
  vocabulary: string[];     // Currently [] (placeholder)
  topics: string[];        // Currently [] (placeholder)
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| [`cefr-detector.ts`](../../features/upload/server/services/analyzers/cefr-detector.ts) | CEFR detection |
| [`vocabulary-extractor.ts`](../../features/upload/server/services/analyzers/vocabulary-extractor.ts) | Vocabulary extraction |
| [`topic-tagger.ts`](../../features/upload/server/services/analyzers/topic-tagger.ts) | Topic tagging |
| [`upload-processor.ts`](../../features/upload/server/services/upload-processor.ts) | Pipeline orchestrator |

---

## Implementation Status

| Analyzer | Implementation |
|----------|---------------|
| CEFR | Hardcoded "B2", ready for AI |
| Vocabulary | Returns `[]`, ready for AI |
| Topics | Returns `[]`, ready for AI |

---

## Related Docs

- **[Upload Data Flow](./upload-data-flow.md)** — Server-side processing flow
- **[Upload Render Flow](./upload-render-flow.md)** — Client-side UI flow
