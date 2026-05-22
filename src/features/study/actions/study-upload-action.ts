'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';
import { getHeuristicCEFR, type CEFRLevel } from '@/lib/domain/cefr';
import type { PassageData } from '../study-types';
import { getAuthenticatedUser } from './study-shared';

const log = createModuleLogger('actions:study-upload');

export type UploadResult = { passage: PassageData } | { error: string };

export type SourceType = Extract<PassageData['sourceType'], 'TEXT' | 'PDF'>;

export async function studyUploadAction({ text, title, sourceType = 'TEXT' }: { text: string; title: string; sourceType?: SourceType }): Promise<UploadResult> {
  const start = Date.now();
  log.info({ title, charCount: text.length }, 'Upload action started');

  return Sentry.withServerActionInstrumentation('studyUpload', {
    headers: await headers(),
  }, async () => {
    if (!text || text.length < 50) {
      return { error: 'Text too short (minimum 50 characters)' };
    }

    let originalLevel: CEFRLevel | null = null;

    const detectStart = Date.now();
    originalLevel = getHeuristicCEFR(text);
    log.info({ level: originalLevel, ms: Date.now() - detectStart }, 'CEFR level computed');

    const user = await getAuthenticatedUser();

    Sentry.addBreadcrumb({ category: 'db', message: 'Creating passage', level: 'info' });
    const passage = await Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, async () => {
      return db.passage.create({
        data: {
          userId: user.id,
          title,
          content: text,
          originalLevel,
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
          sourceType,
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
        sourceType: passage.sourceType,
      },
    };
  });
}
