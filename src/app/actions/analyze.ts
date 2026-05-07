'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { withUserContext } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';
import { detectCEFRLevel, getHeuristicCEFR } from '@/lib/ai/cefr-detector';
import { simplifyContent } from '@/lib/ai/content-simplifier';
import { generateComprehensionQuestions, type GeneratedQuestion } from '@/lib/ai/question-generator';
import { getAuthenticatedUser } from './study-shared';

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
      const cefrResult = await Sentry.startSpan({ name: 'ai:cefr-detect', op: 'ai' }, async () => {
        return detectCEFRLevel(truncatedText.slice(0, 2000));
      });
      originalLevel = cefrResult?.level ?? null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, title }, 'CEFR detection failed — falling back to heuristic');
      originalLevel = getHeuristicCEFR(text);
    }

    if (originalLevel && originalLevel !== 'A1' && originalLevel !== 'A2') {
      const targetMap: Record<string, string> = { C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2' };
      const targetLevel = targetMap[originalLevel] || 'B1';

      try {
        Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
        const simplified = await Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, async () => {
          return simplifyContent(truncatedText, targetLevel);
        });
        if (simplified) {
          simplifiedContent = simplified.simplifiedText;
          simplifiedLevel = targetLevel;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.warn({ err, targetLevel, originalLevel }, 'Content simplification failed — serving original text');
      }
    }

    const contentToAnalyze = simplifiedContent || text;
    let questions: GeneratedQuestion[] = [];

    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
      const questionResult = await Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, async () => {
        return generateComprehensionQuestions(contentToAnalyze.slice(0, 10000), 5);
      });
      if (questionResult) {
        questions = questionResult.questions;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, contentLength: contentToAnalyze.length }, 'Question generation failed — passage saved without questions');
    }

    const user = await getAuthenticatedUser();
    const userDb = withUserContext(user.id);

    Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage with questions', level: 'info' });
    const passage = await Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, async () => {
      return userDb.passage.create({
        data: {
          userId: user.id,
          title,
          content: text,
          simplifiedContent,
          originalLevel: originalLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
          simplifiedLevel: simplifiedLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
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
