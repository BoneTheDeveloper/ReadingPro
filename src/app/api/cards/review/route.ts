import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { updateQuestionReview } from '@/lib/db/quiz/quiz-review';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { isAuthenticationRequiredError, isOwnershipMissError } from '@/lib/api/route-errors';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';
import { toQuestionReviewDto } from '@/lib/study/shared/study-response-schema';

const questionReviewSchema = z.object({
  questionReviewId: z.string().uuid(),
  qualityRating: z.number().int().min(0).max(5),
});

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    'api:cards:review',
    createRequestLogContext(request, 'POST', '/api/cards/review'),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = questionReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { questionReviewId, qualityRating } = parsed.data;
    const user = await getAuthenticatedUser();

    const updatedReview = await Sentry.startSpan({ name: 'db:question-review-update', op: 'db' }, async () => {
      return updateQuestionReview(user.id, questionReviewId, qualityRating);
    });

    return NextResponse.json({ success: true, data: toQuestionReviewDto(updatedReview) });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (isOwnershipMissError(error, ['question review', 'questionreview', 'card review', 'cardreview'])) {
      return NextResponse.json({ error: 'Question review not found.' }, { status: 404 });
    }

    requestLog.error({ err: error }, 'Failed to submit review');
    Sentry.captureException(error, {
      tags: { route: 'api:cards:review', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
