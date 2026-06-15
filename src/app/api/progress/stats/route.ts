import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getUserProgress } from '@/lib/db/quiz/quiz-review';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { isAuthenticationRequiredError } from '@/lib/api/route-errors';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:progress:stats',
    createRequestLogContext(request, 'GET', '/api/progress/stats'),
  );

  try {
    const user = await getAuthenticatedUser();
    const stats = await Sentry.startSpan(
      { name: 'db:progress-stats', op: 'db' },
      async () => getUserProgress(user.id),
    );

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    requestLog.error({ err: error }, 'Failed to fetch progress stats');
    Sentry.captureException(error, {
      tags: { route: 'api:progress:stats', method: 'GET' },
    });
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 },
    );
  }
}
