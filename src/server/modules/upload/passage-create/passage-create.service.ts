import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { createModuleLogger } from '@/server/core/logger';
import { getHeuristicCEFR } from '@/shared/domain/cefr';
import { createPassage } from '@/server/db/passage-queries';
import type { PassageData } from '@/features/study/model/types';

const log = createModuleLogger('service:passage-create');

export type CreatePassageInput = {
  userId: string;
  text: string;
  title: string;
  sourceType: 'TEXT' | 'PDF';
};

export async function createPassageRecord(input: CreatePassageInput): Promise<PassageData> {
  const { userId, text, title, sourceType } = input;

  const originalLevel = getHeuristicCEFR(text);
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  log.info({ level: originalLevel }, 'CEFR level computed');

  const passage = await Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, async () => {
    return createPassage(userId, {
      title,
      content: text,
      originalLevel,
      wordCount,
      sourceType,
    });
  });

  return {
    id: passage.id,
    title: passage.title,
    content: passage.content,
    simplifiedContent: passage.simplifiedContent,
    originalLevel: passage.originalLevel,
    simplifiedLevel: passage.simplifiedLevel,
    wordCount: passage.wordCount,
    createdAt: passage.createdAt.getTime(),
    sourceType: passage.sourceType,
  };
}
