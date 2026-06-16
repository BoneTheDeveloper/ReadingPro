'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { createModuleLogger } from '@/server/core/logger';
import { createPassageRecord } from '@/server/modules/upload/passage-create/passage-create.service';
import type { PassageData } from '@/features/study/model/types';
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

    const user = await getAuthenticatedUser();

    const passage = await createPassageRecord({
      userId: user.id,
      text,
      title,
      sourceType,
    });

    log.info({ passageId: passage.id, totalMs: Date.now() - start }, 'Upload action complete');

    return { passage };
  });
}
