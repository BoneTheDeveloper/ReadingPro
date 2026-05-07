import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { updateCardReview } from '@/lib/db/utils';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:cards:review');

export async function POST(request: NextRequest) {
  try {
    const { cardReviewId, qualityRating } = await request.json();
    const user = await getAuthenticatedUser();

    if (!cardReviewId || typeof qualityRating !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    if (qualityRating < 0 || qualityRating > 5) {
      return NextResponse.json(
        { error: 'Quality rating must be between 0 and 5' },
        { status: 400 }
      );
    }

    const updatedReview = await Sentry.startSpan({ name: 'db:card-review-update', op: 'db' }, async () => {
      const existing = await db.cardReview.findUniqueOrThrow({
        where: { id: cardReviewId },
      });

      if (existing.userId !== user.id) {
        throw new Error('Unauthorized');
      }

      return updateCardReview(cardReviewId, qualityRating);
    });

    return NextResponse.json({ success: true, data: updatedReview });
  } catch (error) {
    log.error({ err: error }, 'Failed to submit review');
    Sentry.captureException(error, {
      tags: { route: 'api:cards:review', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
