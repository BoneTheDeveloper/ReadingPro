import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getDueCards } from '@/lib/db/card-review-queries';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { isAuthenticationRequiredError } from '@/lib/api/route-errors';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';
import { toCardReviewDto } from '@/lib/study/shared/study-response-schema';

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:cards:due',
    createRequestLogContext(request, 'GET', '/api/cards/due'),
  );

  try {
    const user = await getAuthenticatedUser();
    const dueCards = await Sentry.startSpan(
      { name: 'db:due-cards-fetch', op: 'db' },
      async () => getDueCards(user.id),
    );

    return NextResponse.json({ success: true, data: dueCards.map(toCardReviewDto) });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    requestLog.error({ err: error }, 'Failed to fetch due cards');
    Sentry.captureException(error, {
      tags: { route: 'api:cards:due', method: 'GET' },
    });
    return NextResponse.json(
      { error: 'Failed to fetch due cards' },
      { status: 500 },
    );
  }
}
