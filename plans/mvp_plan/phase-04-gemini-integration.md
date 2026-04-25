---
title: "Phase 04: Gemini AI Integration"
description: "Integrate Google Gemini API via Vercel AI SDK (generateObject + Zod) for CEFR level detection, content simplification, and reading comprehension question generation with citations"
status: pending
priority: P1
effort: 8h
branch: main
tags: [ai, gemini, cefr, content-generation]
created: 2026-04-20
---

# Phase 04: Gemini AI Integration (Vercel AI SDK)

**Status:** pending
**Owner:** unassigned
**Dependencies:** Phase 01, Phase 02

---

## Overview

Integrate Google Gemini API via **Vercel AI SDK** (`generateObject`) for AI-powered content analysis including CEFR level detection, text simplification, and reading comprehension question generation with citations. Uses **Zod schemas** for type-safe, validated responses.

---

## Requirements

### Functional
- CEFR level detection (A1-C2) from text analysis
- Content simplification to target reading level
- Generate 5-10 multiple-choice questions per passage
- Include source citations (line numbers) for each question
- Provide explanations for correct answers
- Handle API rate limits and errors gracefully

### Non-Functional
- API key security via environment variables
- Request/response caching to reduce API calls
- Streaming responses for better UX
- Fallback for API failures
- Type-safe response parsing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Analysis Pipeline                    │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Uploaded   │ -> │   CEFR      │ -> │   Simplify  │         │
│  │  Content   │    │ Detection   │    │   Content   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                            ↓     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Save to  │ <- │  Questions  │ <- │  Generated  │         │
│  │  Database  │    │ with Citations   │  Questions  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel AI SDK + Google Gemini                  │
│  • generateObject() for structured Zod schemas            │
│  • gemini-1.5-flash (fast, cost-effective)         │
│  • Type-safe, validated responses               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Code Files

### Files to Create
- `src/lib/ai/cefr-detector.ts` - CEFR level detection with Zod schema
- `src/lib/ai/content-simplifier.ts` - Text simplification with Zod schema
- `src/lib/ai/question-generator.ts` - Question generation with Zod schema
- `src/app/actions/analyze.ts` - Server action for content analysis

### Files to Modify
- `.env.local` - Add `GOOGLE_AI_API_KEY` (Vercel AI SDK compatible)
- `prisma/schema.prisma` - Verify schema supports AI fields
- `package.json` - Add dependencies (see below)

### Dependencies
```bash
npm install ai @ai-sdk/google zod
```

---

## Implementation Steps

### 1. Setup Gemini Client

**File:** `src/lib/gemini-client.ts`

```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const cefrAnalysisSchema = z.object({
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  confidence: z.number().min(0).max(1),
  vocabularyLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  grammarComplexity: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  sentenceStructure: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  reasoning: z.string(),
});

export type CEFRAnalysis = z.infer<typeof cefrAnalysisSchema>;

export async function detectCEFRLevel(text: string): Promise<CEFRAnalysis> {
  const { object } = await generateObject({
    model: google('gemini-1.5-flash'),
    system: `You are an expert English language educator specializing in CEFR (Common European Framework of Reference for Languages) level assessment.`,
    schema: cefrAnalysisSchema,
    prompt: `Analyze the following English text and determine its CEFR level:

Text (first 2000 characters):
${text.slice(0, 2000)}

Respond with a JSON object matching the schema.`,
  });

  return object;
}

Install dependency:
```bash
npm install @google/generative-ai
```

### 2. CEFR Level Detection

**File:** `src/lib/ai/cefr-detector.ts`

```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const cefrAnalysisSchema = z.object({
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  confidence: z.number().min(0).max(1),
  vocabularyLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  grammarComplexity: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  sentenceStructure: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  reasoning: z.string(),
});

export type CEFRAnalysis = z.infer<typeof cefrAnalysisSchema>;

export async function detectCEFRLevel(text: string): Promise<CEFRAnalysis | null> {
  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: cefrAnalysisSchema,
      system: `You are an expert English language educator specializing in CEFR level assessment. Analyze vocabulary complexity, grammar structures, sentence variety, and cohesion.`,
      prompt: `Analyze the following text and determine its CEFR level:

Text: ${text.slice(0, 2000)}`,
    });
    return object;
  } catch (error) {
    console.error('CEFR detection error:', error);
    return null;
  }
}

/**
 * Heuristic fallback when API fails
 */
export function getHeuristicCEFR(text: string): string {
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const complexWords = words.filter(w => w.length > 6).length;
  const complexWordRatio = complexWords / Math.max(words.length, 1);

  if (avgWordsPerSentence < 10 && complexWordRatio < 0.1) return 'A1';
  if (avgWordsPerSentence < 12 && complexWordRatio < 0.15) return 'A2';
  if (avgWordsPerSentence < 15 && complexWordRatio < 0.2) return 'B1';
  if (avgWordsPerSentence < 18 && complexWordRatio < 0.25) return 'B2';
  if (avgWordsPerSentence < 22 && complexWordRatio < 0.3) return 'C1';
  return 'C2';
}
```

Install dependencies:
```bash
npm install ai @ai-sdk/google zod
```

### 3. Content Simplification

**File:** `src/lib/ai/content-simplifier.ts`

```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const simplifiedContentSchema = z.object({
  simplifiedText: z.string(),
  changes: z.array(z.string()),
  retainedKeyTerms: z.array(z.string()),
});

export type SimplifiedContent = z.infer<typeof simplifiedContentSchema>;

const levelDescriptions: Record<string, string> = {
  A1: 'beginner - use simple present tense, basic vocabulary',
  A2: 'elementary - use past/future tenses, common vocabulary',
  B1: 'intermediate - use present perfect, moderate vocabulary',
  B2: 'upper intermediate - use passive voice, varied vocabulary',
  C1: 'advanced - use complex structures, academic vocabulary',
  C2: 'mastery - maintain complexity, improve clarity',
};

export async function simplifyContent(
  text: string,
  targetLevel: string
): Promise<SimplifiedContent | null> {
  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: simplifiedContentSchema,
      system: `You are an expert English language educator. Simplify text to target CEFR level while maintaining core meaning, logical flow, and key terminology (with context). Rules: simplify vocabulary, break complex sentences, use shorter paragraphs, add transitions, explain difficult terms in parentheses.`,
      prompt: `Simplify this text to CEFR level ${targetLevel} (${levelDescriptions[targetLevel] || ''}):

Original: ${text}`,
    });
    return object;
  } catch (error) {
    console.error('Simplification error:', error);
    return null;
  }
}
```

### 4. Question Generation with Citations

**File:** `src/lib/ai/question-generator.ts`

```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const generatedQuestionSchema = z.object({
  questionText: z.string(),
  options: z.array(questionOptionSchema),
  correctAnswer: z.string(),
  sourceText: z.string(),
  sourceLine: z.number().int().positive(),
  explanation: z.string(),
  questionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE']),
  difficulty: z.number().int().min(1).max(5),
});

export const questionGenerationSchema = z.object({
  questions: z.array(generatedQuestionSchema),
  wordCount: z.number(),
  estimatedTime: z.number(),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type QuestionGenerationResult = z.infer<typeof questionGenerationSchema>;

export async function generateComprehensionQuestions(
  passage: string,
  questionCount: number = 5
): Promise<QuestionGenerationResult | null> {
  try {
    // Number lines for citation references
    const numberedPassage = passage
      .split('\n')
      .map((line, i) => `${i + 1}: ${line}`)
      .join('\n');

    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: questionGenerationSchema,
      system: `You are an expert English language educator. Generate multiple-choice reading comprehension questions that: test understanding (not memory), have clear answers from text, include line number citations, range factual to inferential, cover different parts of passage. Wrong answers should be plausible but clearly incorrect.`,
      prompt: `Generate ${questionCount} reading comprehension questions for this passage:

${numberedPassage}`,
    });

    return object;
  } catch (error) {
    console.error('Question generation error:', error);
    return null;
  }
}

export function parsePassageLines(passage: string): Array<{ lineNumber: number; text: string }> {
  return passage
    .split('\n')
    .map((line, i) => ({ lineNumber: i + 1, text: line.trim() }))
    .filter(line => line.text.length > 0);
}
```

### 5. Create Analysis Server Action

**File:** `src/app/actions/analyze.ts`

```typescript
'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { db } from '@/lib/db';
import { cefrAnalysisSchema } from '@/lib/ai/cefr-detector';
import { simplifiedContentSchema } from '@/lib/ai/content-simplifier';
import { questionGenerationSchema } from '@/lib/ai/question-generator';

export async function analyzeContentAction(formData: FormData) {
  const text = formData.get('text') as string;
  const title = formData.get('title') as string || 'Untitled';

  if (!text || text.length < 50) {
    return { error: 'Text too short' };
  }

  // 1. Detect CEFR level
  const { object: cefrResult } = await generateObject({
    model: google('gemini-1.5-flash'),
    schema: cefrAnalysisSchema,
    prompt: `Analyze text and return CEFR level: ${text.slice(0, 2000)}`,
  });

  const originalLevel = cefrResult.level;

  // 2. Simplify if not A1/A2
  let simplifiedContent: string | null = null;
  let simplifiedLevel: string | null = null;

  if (originalLevel !== 'A1' && originalLevel !== 'A2') {
    const targetMap: Record<string, string> = {
      C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2',
    };
    const targetLevel = targetMap[originalLevel] || 'B1';

    const { object: simplified } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: simplifiedContentSchema,
      prompt: `Simplify to ${targetLevel}: ${text}`,
    });

    simplifiedContent = simplified.simplifiedText;
    simplifiedLevel = targetLevel;
  }

  // 3. Generate questions (on-demand, lazy)
  const contentToAnalyze = simplifiedContent || text;

  const { object: questionResult } = await generateObject({
    model: google('gemini-1.5-flash'),
    schema: questionGenerationSchema,
    prompt: `Generate 5 comprehension questions for: ${contentToAnalyze}`,
  });

  // 4. Save to database
  const passage = await db.passage.create({
    data: {
      title,
      content: text,
      simplifiedContent,
      originalLevel,
      simplifiedLevel,
      wordCount: text.split(/\s+/).length,
      questions: {
        create: questionResult.questions.map(q => ({
          questionText: q.questionText,
          options: JSON.stringify(q.options),
          correctOption: q.correctAnswer,
          sourceText: q.sourceText,
          sourceLine: q.sourceLine,
          explanation: q.explanation,
          questionType: q.questionType,
          difficulty: q.difficulty,
        })),
      },
    },
  });

  return {
    passageId: passage.id,
    originalLevel,
    simplifiedLevel,
    questionCount: questionResult.questions.length,
  };
}
```

### 6. Create Processing View (UX)

**File:** `src/app/(dashboard)/processing/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function ProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'analyzing' | 'generating' | 'complete'>('analyzing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate processing stages
    const stages = [
      { status: 'analyzing' as const, progress: 20 },
      { status: 'simplifying' as const, progress: 40 },
      { status: 'generating' as const, progress: 70 },
      { status: 'complete' as const, progress: 100 },
    ];

    let currentStage = 0;

    const interval = setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setStatus(stages[currentStage].status === 'simplifying' ? 'analyzing' : 'generating');
        setProgress(stages[currentStage].progress);
      } else {
        clearInterval(interval);
        // Navigate to reading view after completion
        setTimeout(() => {
          router.push('/reading/demo-passage-id');
        }, 500);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  const messages = {
    analyzing: 'Analyzing text complexity...',
    generating: 'Generating comprehension questions...',
    complete: 'Processing complete!',
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <RefreshCw className="w-full h-full text-primary-600 animate-spin" />
        </div>

        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          {messages[status === 'analyzing' ? 'analyzing' : 'generating']}
        </h2>

        <p className="text-neutral-500 mb-8">
          Our AI is analyzing your content and creating personalized learning materials.
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
          <div
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm text-neutral-400">{progress}% complete</p>
      </div>
    </div>
  );
}
```

---

## Todo List

- [ ] Install dependencies: `ai @ai-sdk/google zod`
- [ ] Configure `GOOGLE_AI_API_KEY` environment variable
- [ ] Implement CEFR level detection with Zod schema
- [ ] Implement content simplification with Zod schema
- [ ] Implement question generation with Zod schema
- [ ] Create analysis server action
- [ ] Add error handling and fallbacks
- [ ] Test with various text types and levels

---

## Success Criteria

1. ✅ CEFR detection returns valid levels (A1-C2)
2. ✅ Simplified content is readable at target level
3. ✅ Generated questions include accurate source citations
4. ✅ API handles errors gracefully with fallbacks
5. ✅ Processing UX shows clear progress indication
6. ✅ Database saves all analysis results correctly

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini API rate limits | Medium | Request queuing, fallback to heuristic CEFR |
| Hallucinated source citations | High | Validate citations against actual passage |
| Poor question quality | Medium | Review prompt, regenerate low-quality questions |
| Zod schema mismatch | Low | Test with various outputs, adjust schema |
| AI SDK breaking changes | Low | Pin versions in package.json |

---

## Next Steps

After completion:
- Proceed to [Phase 05: Reading View](phase-05-reading-view.md)

---

## Context Links

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [CEFR Research](../reports/researcher-text-difficulty-analysis-260420-2152.md)
- [Question Generation Research](../reports/researcher-flashcard-educational-systems-2024.md)
