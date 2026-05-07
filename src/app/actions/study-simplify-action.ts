'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { withUserContext } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';
import { simplifyContent } from '@/lib/ai/content-simplifier';
import { getAuthenticatedUser } from './study-shared';

const log = createModuleLogger('actions:study-simplify');

const TARGET_LEVEL_MAP: Record<string, string> = {
  C2: 'C1', C1: 'B2', B2: 'B1', B1: 'A2',
};

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
    const userDb = withUserContext(user.id);

    // Fetch passage (auto-scoped by extension)
    const passage = await Sentry.startSpan({ name: 'db:passage-fetch', op: 'db' }, async () => {
      return userDb.passage.findUnique({ where: { id: passageId } });
    });

    if (!passage) {
      return { error: 'Passage not found' };
    }

    const { originalLevel } = passage;
    if (!originalLevel || originalLevel === 'A1' || originalLevel === 'A2') {
      return { skipped: true as const, reason: `Text is already ${originalLevel || 'unknown'} level` };
    }

    const targetLevel = TARGET_LEVEL_MAP[originalLevel] || 'B1';

    // Simplify content via module function (includes system prompt + prompt injection protection)
    try {
      Sentry.addBreadcrumb({ category: 'ai', message: `Simplifying to ${targetLevel}`, level: 'info' });
      const simplified = await Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, async () => {
        return simplifyContent(passage.content.slice(0, 10000), targetLevel);
      });

      if (!simplified) {
        return { error: 'Simplification failed — try again' };
      }

      // Update passage in DB (auto-scoped by extension)
      await Sentry.startSpan({ name: 'db:passage-update', op: 'db' }, async () => {
        return userDb.passage.update({
          where: { id: passageId },
          data: {
            simplifiedContent: simplified.simplifiedText,
            simplifiedLevel: targetLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
          },
        });
      });

      log.info({ passageId, from: originalLevel, to: targetLevel, totalMs: Date.now() - start }, 'Simplify action complete');

      return {
        simplifiedContent: simplified.simplifiedText,
        simplifiedLevel: targetLevel,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, passageId, targetLevel, totalMs: Date.now() - start }, 'Simplification failed');
      return { error: 'Simplification failed — try again' };
    }
  });
}
