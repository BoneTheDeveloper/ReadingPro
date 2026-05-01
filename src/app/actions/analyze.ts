'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('actions:analyze');
import { cefrAnalysisSchema } from '@/lib/ai/cefr-detector';
import { simplifiedContentSchema } from '@/lib/ai/content-simplifier';
import { questionGenerationSchema, type QuestionGenerationResult } from '@/lib/ai/question-generator';
import { getHeuristicCEFR } from '@/lib/ai/cefr-detector';

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
      const { object: cefrResult } = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: cefrAnalysisSchema,
        prompt: `Analyze text and return CEFR level: ${truncatedText.slice(0, 2000)}`,
      });
      originalLevel = cefrResult.level;
    } catch (error) {
      log.warn('CEFR detection failed, using heuristic');
      Sentry.captureException(error, { level: 'warning', tags: { action: 'analyzeContent', step: 'cefr' } });
      originalLevel = getHeuristicCEFR(text);
    }

    if (originalLevel && originalLevel !== 'A1' && originalLevel !== 'A2') {
      const targetMap: Record<string, string> = {
        C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2',
      };
      const targetLevel = targetMap[originalLevel] || 'B1';

      try {
        Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
        const { object: simplified } = await generateObject({
          model: google('gemini-1.5-flash'),
          schema: simplifiedContentSchema,
          prompt: `Simplify to ${targetLevel}: ${truncatedText}`,
        });
        simplifiedContent = simplified.simplifiedText;
        simplifiedLevel = targetLevel;
      } catch (error) {
        log.warn('Simplification failed, using original');
        Sentry.captureException(error, { level: 'warning', tags: { action: 'analyzeContent', step: 'simplify' } });
      }
    }

    const contentToAnalyze = simplifiedContent || text;

    let questions: QuestionGenerationResult['questions'] = [];

    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
      const { object: questionResult } = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: questionGenerationSchema,
        prompt: `Generate 5 comprehension questions for: ${contentToAnalyze.slice(0, 10000)}`,
      });
      questions = questionResult.questions;
    } catch (error) {
      log.warn('Question generation failed');
      Sentry.captureException(error, { level: 'warning', tags: { action: 'analyzeContent', step: 'questions' } });
    }

    const userEmail = 'demo@example.com';
    let user = await db.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await db.user.create({
        data: { email: userEmail, name: 'Demo User' },
      });
    }

    Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage with questions', level: 'info' });
    const passage = await db.passage.create({
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

    return {
      passageId: passage.id,
      originalLevel,
      simplifiedLevel,
      questionCount: questions.length,
    };
  });
}

export async function studyAnalyzeAction({ text, title }: { text: string; title: string }) {
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

    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Detecting CEFR level', level: 'info' });
      const { object: cefrResult } = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: cefrAnalysisSchema,
        prompt: `Analyze text and return CEFR level: ${truncatedText.slice(0, 2000)}`,
      });
      originalLevel = cefrResult.level;
    } catch (error) {
      originalLevel = getHeuristicCEFR(text);
      Sentry.captureException(error, { level: 'warning', tags: { action: 'studyAnalyze', step: 'cefr' } });
    }

    if (originalLevel && originalLevel !== 'A1' && originalLevel !== 'A2') {
      const targetMap: Record<string, string> = { C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2' };
      const targetLevel = targetMap[originalLevel] || 'B1';
      try {
        Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
        const { object: simplified } = await generateObject({
          model: google('gemini-1.5-flash'),
          schema: simplifiedContentSchema,
          prompt: `Simplify to ${targetLevel}: ${truncatedText}`,
        });
        simplifiedContent = simplified.simplifiedText;
        simplifiedLevel = targetLevel;
      } catch (error) {
        log.warn('Simplification failed');
        Sentry.captureException(error, { level: 'warning', tags: { action: 'studyAnalyze', step: 'simplify' } });
      }
    }

    const contentToAnalyze = simplifiedContent || text;
    let questions: QuestionGenerationResult['questions'] = [];

    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
      const { object: questionResult } = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: questionGenerationSchema,
        prompt: `Generate 5 comprehension questions for: ${contentToAnalyze.slice(0, 10000)}`,
      });
      questions = questionResult.questions;
    } catch (error) {
      log.warn('Question generation failed');
      Sentry.captureException(error, { level: 'warning', tags: { action: 'studyAnalyze', step: 'questions' } });
    }

    const userEmail = 'demo@example.com';
    let user = await db.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await db.user.create({ data: { email: userEmail, name: 'Demo User' } });
    }

    Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage with questions', level: 'info' });
    const passage = await db.passage.create({
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