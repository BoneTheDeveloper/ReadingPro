'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';
import { cefrAnalysisSchema, getHeuristicCEFR } from '@/lib/ai/cefr-detector';
import { getOrCreateDemoUser } from './study-shared';

const log = createModuleLogger('actions:study-upload');

export type UploadResult = { passage: PassageData } | { error: string };

interface PassageData {
  id: string;
  title: string;
  content: string;
  simplifiedContent: string | null;
  originalLevel: string | null;
  simplifiedLevel: string | null;
  wordCount: number;
  createdAt: number;
}

export async function studyUploadAction({ text, title }: { text: string; title: string }): Promise<UploadResult> {
  const start = Date.now();
  log.info({ title, charCount: text.length }, 'Upload action started');

  return Sentry.withServerActionInstrumentation('studyUpload', {
    headers: await headers(),
  }, async () => {
    if (!text || text.length < 50) {
      return { error: 'Text too short (minimum 50 characters)' };
    }

    const truncatedText = text.slice(0, 10000);
    let originalLevel: string | null = null;

    // CEFR detection
    const detectStart = Date.now();
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
      log.warn({ err, title, ms: Date.now() - detectStart }, 'CEFR detection failed, using heuristic');
      originalLevel = getHeuristicCEFR(text);
    }
    log.info({ level: originalLevel, ms: Date.now() - detectStart }, 'CEFR detection done');

    // DB save (passage only, no questions, no simplified content)
    const user = await getOrCreateDemoUser();

    Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage', level: 'info' });
    const passage = await Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, async () => {
      return db.passage.create({
        data: {
          userId: user.id,
          title,
          content: text,
          originalLevel: originalLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null,
          wordCount: text.split(/\s+/).length,
          sourceType: 'TEXT',
        },
      });
    });

    log.info({ passageId: passage.id, totalMs: Date.now() - start }, 'Upload action complete');

    return {
      passage: {
        id: passage.id,
        title: passage.title,
        content: passage.content,
        simplifiedContent: passage.simplifiedContent,
        originalLevel: passage.originalLevel,
        simplifiedLevel: passage.simplifiedLevel,
        wordCount: passage.wordCount,
        createdAt: passage.createdAt.getTime(),
      },
    };
  });
}
