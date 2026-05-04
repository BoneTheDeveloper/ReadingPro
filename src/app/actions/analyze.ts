'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';
import { cefrAnalysisSchema, getHeuristicCEFR } from '@/lib/ai/cefr-detector';
import { simplifiedContentSchema } from '@/lib/ai/content-simplifier';
import { questionGenerationSchema, type QuestionGenerationResult } from '@/lib/ai/question-generator';

const log = createModuleLogger('actions:analyze');

export async function analyzeContentAction(formData: FormData) {
  return Sentry.withServerActionInstrumentation('analyzeContent', {
    headers: await headers(),
  }, async () => {
    const text = formData.get('text') as string;
    const title = (formData.get('title') as string) || 'Untitled';

    if (!text || text.length < 50) {
      return { error: 'Text too short' };
    }

    const truncatedText = text.slice(0, 10000);

    let originalLevel: string | null = null;
    let simplifiedContent: string | null = null;
    let simplifiedLevel: string | null = null;

    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Detecting CEFR level', level: 'info' });
      const { object: cefrResult } = await Sentry.startSpan({ name: 'ai:cefr-detect', op: 'ai' }, async () => {
        return generateObject({
          model: openai('gpt-4o-mini'),
          schema: cefrAnalysisSchema,
          prompt: `Analyze text and return CEFR level: ${truncatedText.slice(0, 2000)}`,
        });
      });
      originalLevel = cefrResult.level;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, title }, 'CEFR detection failed — falling back to heuristic');
      originalLevel = getHeuristicCEFR(text);
    }

    if (originalLevel && originalLevel !== 'A1' && originalLevel !== 'A2') {
      const targetMap: Record<string, string> = {
        C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2',
      };
      const targetLevel = targetMap[originalLevel] || 'B1';

      try {
        Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
        const { object: simplified } = await Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, async () => {
          return generateObject({
            model: openai('gpt-4o-mini'),
            schema: simplifiedContentSchema,
            prompt: `Simplify to ${targetLevel}: ${truncatedText}`,
          });
        });
        simplifiedContent = simplified.simplifiedText;
        simplifiedLevel = targetLevel;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.warn({ err, targetLevel, originalLevel }, 'Content simplification failed — serving original text');
      }
    }

    const contentToAnalyze = simplifiedContent || text;

    let questions: QuestionGenerationResult['questions'] = [];

    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
      const { object: questionResult } = await Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, async () => {
        return generateObject({
          model: openai('gpt-4o-mini'),
          schema: questionGenerationSchema,
          prompt: `Generate 5 comprehension questions for: ${contentToAnalyze.slice(0, 10000)}`,
        });
      });
      questions = questionResult.questions;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, contentLength: contentToAnalyze.length }, 'Question generation failed — passage saved without questions');
    }

    const userEmail = 'demo@example.com';
    let user = await Sentry.startSpan({ name: 'db:user-lookup', op: 'db' }, async () => {
      let u = await db.user.findUnique({ where: { email: userEmail } });
      if (!u) u = await db.user.create({ data: { email: userEmail, name: 'Demo User' } });
      return u;
    });

    Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage with questions', level: 'info' });
    const passage = await Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, async () => {
      return db.passage.create({
        data: {
          userId: user.id,
          title,
          content: text,
          simplifiedContent,
          originalLevel: originalLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
          simplifiedLevel: simplifiedLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
          wordCount: text.split(/\s+/).length,
          sourceType: 'TEXT',
          questions: {
            create: questions.map(q => ({
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
    });

    return {
      passageId: passage.id,
      originalLevel,
      simplifiedLevel,
      questionCount: questions.length,
    };
  });
}

export async function studyAnalyzeAction({ text, title }: { text: string; title: string }) {
  const pipelineStart = Date.now();
  log.info({ title, charCount: text.length, wordCount: text.split(/\s+/).length }, 'Analysis pipeline started');

  return Sentry.withServerActionInstrumentation('studyAnalyze', {
    headers: await headers(),
  }, async () => {
    if (!text || text.length < 50) {
      return { error: 'Text too short (minimum 50 characters)' };
    }

    const truncatedText = text.slice(0, 10000);
    let originalLevel: string | null = null;
    let simplifiedContent: string | null = null;
    let simplifiedLevel: string | null = null;

    // Step 1: CEFR detection
    const step1Start = Date.now();
    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Detecting CEFR level', level: 'info' });
      const { object: cefrResult } = await Sentry.startSpan({ name: 'ai:cefr-detect', op: 'ai' }, async () => {
        return generateObject({
          model: openai('gpt-4o-mini'),
          schema: cefrAnalysisSchema,
          prompt: `Analyze text and return CEFR level: ${truncatedText.slice(0, 2000)}`,
        });
      });
      originalLevel = cefrResult.level;
      log.info({ level: originalLevel, ms: Date.now() - step1Start }, 'Step 1/4 — CEFR detection done');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, title, ms: Date.now() - step1Start }, 'Step 1/4 — CEFR detection failed, using heuristic');
      originalLevel = getHeuristicCEFR(text);
    }

    // Step 2: Content simplification (skip for A1/A2)
    const step2Start = Date.now();
    if (originalLevel && originalLevel !== 'A1' && originalLevel !== 'A2') {
      const targetMap: Record<string, string> = { C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2' };
      const targetLevel = targetMap[originalLevel] || 'B1';
      try {
        Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
        const { object: simplified } = await Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, async () => {
          return generateObject({
            model: openai('gpt-4o-mini'),
            schema: simplifiedContentSchema,
            prompt: `Simplify to ${targetLevel}: ${truncatedText}`,
          });
        });
        simplifiedContent = simplified.simplifiedText;
        simplifiedLevel = targetLevel;
        log.info({ from: originalLevel, to: targetLevel, ms: Date.now() - step2Start }, 'Step 2/4 — Content simplification done');
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.warn({ err, targetLevel, originalLevel, ms: Date.now() - step2Start }, 'Step 2/4 — Content simplification failed, using original');
      }
    } else {
      log.info({ level: originalLevel, ms: Date.now() - step2Start }, 'Step 2/4 — Skipped (A1/A2 text)');
    }

    // Step 3: Question generation
    const contentToAnalyze = simplifiedContent || text;
    const step3Start = Date.now();
    let questions: QuestionGenerationResult['questions'] = [];

    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
      const { object: questionResult } = await Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, async () => {
        return generateObject({
          model: openai('gpt-4o-mini'),
          schema: questionGenerationSchema,
          prompt: `Generate 5 comprehension questions for: ${contentToAnalyze.slice(0, 10000)}`,
        });
      });
      questions = questionResult.questions;
      log.info({ count: questions.length, ms: Date.now() - step3Start }, 'Step 3/4 — Question generation done');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, contentLength: contentToAnalyze.length, ms: Date.now() - step3Start }, 'Step 3/4 — Question generation failed');
    }

    // Step 4: DB save
    const step4Start = Date.now();
    const userEmail = 'demo@example.com';
    let user = await Sentry.startSpan({ name: 'db:user-lookup', op: 'db' }, async () => {
      let u = await db.user.findUnique({ where: { email: userEmail } });
      if (!u) u = await db.user.create({ data: { email: userEmail, name: 'Demo User' } });
      return u;
    });

    Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage with questions', level: 'info' });
    const passage = await Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, async () => {
      return db.passage.create({
        data: {
          userId: user.id,
          title,
          content: text,
          simplifiedContent,
          originalLevel: originalLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
          simplifiedLevel: simplifiedLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
          wordCount: text.split(/\s+/).length,
          sourceType: 'TEXT',
          questions: {
            create: questions.map(q => ({
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
        include: { questions: true },
      });
    });
    log.info({ passageId: passage.id, questionCount: passage.questions.length, ms: Date.now() - step4Start }, 'Step 4/4 — DB save done');
    log.info({ totalMs: Date.now() - pipelineStart }, 'Analysis pipeline complete');

    const passageData = {
      id: passage.id,
      title: passage.title,
      content: passage.content,
      simplifiedContent: passage.simplifiedContent,
      originalLevel: passage.originalLevel,
      simplifiedLevel: passage.simplifiedLevel,
      wordCount: passage.wordCount,
    };

    const questionsData = passage.questions.map((q, i) => {
      let parsedOptions: Array<{ id: string; text: string }> = [];
      try { parsedOptions = JSON.parse(q.options as string); } catch { parsedOptions = []; }
      return {
        id: q.id,
        number: i + 1,
        questionText: q.questionText,
        options: parsedOptions,
        correctAnswer: q.correctOption,
        explanation: q.explanation,
        sourceText: q.sourceText,
        sourceLine: q.sourceLine,
        questionType: q.questionType,
        difficulty: q.difficulty,
      };
    }).filter(q => q.options.length > 0);

    return { passage: passageData, questions: questionsData };
  });
}