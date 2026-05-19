'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { createModuleLogger } from '@/lib/core/logger';
import { getAuthenticatedUser } from './study-shared';
import { PassageStudyServiceError, simplifyPassageForUser } from '../services/passage-study-service';

const log = createModuleLogger('actions:study-simplify');

export type SimplifyResult =
  | { simplifiedContent: string; simplifiedLevel: string }
  | { skipped: true; reason: string }
  | { error: string };

export async function studySimplifyAction({ passageId }: { passageId: string }): Promise<SimplifyResult> {
  const start = Date.now();
  log.info({ passageId }, 'Simplify action started');

  return Sentry.withServerActionInstrumentation('studySimplify', {
    headers: await headers(),
  }, async () => {
    const user = await getAuthenticatedUser();

    try {
      const result = await simplifyPassageForUser(user.id, passageId);
      log.info({ passageId, totalMs: Date.now() - start }, 'Simplify action complete');
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (error instanceof PassageStudyServiceError) {
        return { error: error.message };
      }
      log.warn({ err, passageId, totalMs: Date.now() - start }, 'Simplification failed');
      return { error: 'Simplification failed — try again' };
    }
  });
}
