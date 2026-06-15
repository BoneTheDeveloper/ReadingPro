import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getDueQuestions } from '@/lib/db/quiz/quiz-review';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { isAuthenticationRequiredError } from '@/lib/api/route-errors';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';
import { toQuestionReviewDto } from '@/lib/study/shared/study-response-schema';

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:cards:due',
    createRequestLogContext(request, 'GET', '/api/cards/due'),
  );

  try {
    const user = await getAuthenticatedUser();
    const dueQuestions = await Sentry.startSpan(
      { name: 'db:due-questions-fetch', op: 'db' },
      async () => getDueQuestions(user.id),
    );

    return NextResponse.json({ success: true, data: dueQuestions.map(toQuestionReviewDto) });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    requestLog.error({ err: error }, 'Failed to fetch due questions');
    Sentry.captureException(error, {
      tags: { route: 'api:cards:due', method: 'GET' },
    });
    return NextResponse.json(
      { error: 'Failed to fetch due questions' },
      { status: 500 },
    );
  }
}
