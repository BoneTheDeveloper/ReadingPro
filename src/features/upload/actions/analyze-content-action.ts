'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { getAuthenticatedUser } from '@/server/auth/auth-utils';
import { analyzeAndPersistContent } from '@/server/modules/upload/content-analysis/content-analysis.service';

export async function analyzeContentAction(formData: FormData) {
  return Sentry.withServerActionInstrumentation('analyzeContent', {
    headers: await headers(),
  }, async () => {
    const text = formData.get('text') as string;
    const title = (formData.get('title') as string) || 'Untitled';

    if (!text || text.length < 50) {
      return { error: 'Text too short' };
    }
    const user = await getAuthenticatedUser();
    return analyzeAndPersistContent({ userId: user.id, text, title, sourceType: 'TEXT' });
  });
}
