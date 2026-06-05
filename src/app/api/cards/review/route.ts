import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { updateCardReview } from '@/lib/db/card-review-queries';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createRequestLogContext, createRequestLogger } from '@/lib/core/logger';
import { toCardReviewDto } from '@/lib/study/shared/study-response-schema';

const cardReviewSchema = z.object({
  cardReviewId: z.string().uuid(),
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

    const parsed = cardReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { cardReviewId, qualityRating } = parsed.data;
    const user = await getAuthenticatedUser();

    const updatedReview = await Sentry.startSpan({ name: 'db:card-review-update', op: 'db' }, async () => {
      return updateCardReview(user.id, cardReviewId, qualityRating);
    });

    return NextResponse.json({ success: true, data: toCardReviewDto(updatedReview) });
  } catch (error) {
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
