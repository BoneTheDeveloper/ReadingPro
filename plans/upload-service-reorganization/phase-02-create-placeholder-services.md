---
phase: 2
title: Create-Placeholder-Services
status: completed
priority: P2
effort: 1h
dependencies:
  - phase-01-setup-services-structure
---

# Phase 2: Create-Placeholder-Services

## Overview

Create placeholder services for text normalization and AI analysis. All placeholders follow the pattern: async function, hardcoded defaults, no throws.

## Requirements

- Functional: Create services that return hardcoded defaults, ready for real implementation
- Non-functional: Async functions, consistent naming, proper TypeScript types

## Architecture

### Normalizer Services

**text-normalizer.service.ts**
- Input: raw text string
- Output: normalized text
- Current: Basic cleanup (trim, collapse whitespace) — matches existing `parsePDF` behavior
- Future: More sophisticated cleaning (PDF artifacts, encoding normalization)

**pdf-normalizer.service.ts**
- Input: raw PDF text (already parsed)
- Output: cleaned PDF text
- Current: Basic cleanup (remove `\f`, collapse whitespace)
- Future: Remove headers/footers, page numbers, footnotes

### Analyzer Services (Placeholders)

**cefr-detector.service.ts**
- Input: normalized text
- Output: `{ cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" }`
- Current: Returns hardcoded `"B2"`
- Future: AI-based CEFR detection

**vocabulary-extractor.service.ts**
- Input: normalized text
- Output: `{ vocabulary: string[] }`
- Current: Returns empty array `[]`
- Future: AI-based vocabulary extraction

**topic-tagger.service.ts**
- Input: normalized text
- Output: `{ topics: string[] }`
- Current: Returns empty array `[]`
- Future: AI-based topic extraction

## Related Code Files

- Create: `src/features/upload/services/normalizers/text-normalizer.service.ts`
- Create: `src/features/upload/services/normalizers/pdf-normalizer.service.ts`
- Create: `src/features/upload/services/analyzers/cefr-detector.service.ts`
- Create: `src/features/upload/services/analyzers/vocabulary-extractor.service.ts`
- Create: `src/features/upload/services/analyzers/topic-tagger.service.ts`

## Implementation Steps

### Normalizers

1. **text-normalizer.service.ts**
   ```typescript
   export async function normalizeText(text: string): Promise<string> {
     return text
       .replace(/\r\n/g, '\n')      // Normalize line endings
       .replace(/\r/g, '\n')
       .replace(/[ \t]+/g, ' ')     // Collapse spaces/tabs
       .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
       .trim();
   }
   ```

2. **pdf-normalizer.service.ts**
   ```typescript
   export async function normalizePdfText(text: string): Promise<string> {
     // Current: basic cleanup matching parsePDF behavior
     return text
       .replace(/\f/g, '\n\n')     // Form feeds → double newline
       .replace(/[ \t]+/g, ' ')    // Collapse whitespace
       .split('\n')
       .filter(line => line.trim().length > 0)
       .join('\n')
       .trim();
   }
   ```

### Analyzers (Placeholders)

3. **cefr-detector.service.ts**
   ```typescript
   export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

   export interface CefrResult {
     cefrLevel: CEFRLevel;
   }

   // Placeholder: returns hardcoded default
   export async function detectCefrLevel(text: string): Promise<CefrResult> {
     // TODO: Implement AI-based CEFR detection
     return { cefrLevel: "B2" };
   }
   ```

4. **vocabulary-extractor.service.ts**
   ```typescript
   export interface VocabularyResult {
     vocabulary: string[];
   }

   // Placeholder: returns empty array
   export async function extractVocabulary(text: string): Promise<VocabularyResult> {
     // TODO: Implement AI-based vocabulary extraction
     return { vocabulary: [] };
   }
   ```

5. **topic-tagger.service.ts**
   ```typescript
   export interface TopicResult {
     topics: string[];
   }

   // Placeholder: returns empty array
   export async function extractTopics(text: string): Promise<TopicResult> {
     // TODO: Implement AI-based topic extraction
     return { topics: [] };
   }
   ```

## Success Criteria

- [ ] `text-normalizer.service.ts` exists with `normalizeText` function
- [ ] `pdf-normalizer.service.ts` exists with `normalizePdfText` function
- [ ] `cefr-detector.service.ts` exists with `detectCefrLevel` returning `"B2"`
- [ ] `vocabulary-extractor.service.ts` exists with `extractVocabulary` returning `[]`
- [ ] `topic-tagger.service.ts` exists with `extractTopics` returning `[]`
- [ ] All functions are async and take text as input
- [ ] All return proper TypeScript types

## Risk Assessment

- **Risk**: None — all functions are new, no existing code affected
- **Mitigation**: N/A
