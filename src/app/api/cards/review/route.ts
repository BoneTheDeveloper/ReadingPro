import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { updateCardReview } from '@/lib/db/utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:cards:review');

export async function POST(request: NextRequest) {
  try {
    const { cardReviewId, qualityRating } = await request.json();

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

    const updatedReview = await updateCardReview(cardReviewId, qualityRating);

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
