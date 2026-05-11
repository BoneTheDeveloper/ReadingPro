'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { deletePassage } from '@/lib/db/passage-queries';
import { getAuthenticatedUser } from './study-shared';

export type DeletePassageResult = { success: true } | { error: string };

export async function studyDeletePassageAction({ passageId }: { passageId: string }): Promise<DeletePassageResult> {
  return Sentry.withServerActionInstrumentation('studyDeletePassage', {
    headers: await headers(),
  }, async () => {
    const user = await getAuthenticatedUser();

    await deletePassage(passageId, user.id);

    return { success: true as const };
  });
}
