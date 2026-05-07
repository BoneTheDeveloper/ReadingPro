import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:study-session');

export async function POST(request: NextRequest) {
  try {
    const { passageId } = await request.json();
    const user = await getAuthenticatedUser();

    const session = await Sentry.startSpan({ name: 'db:session-create', op: 'db' }, async () => {
      return db.studySession.create({
        data: {
          userId: user.id,
          passageId,
          startedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    log.error({ err: error }, 'Failed to create session');
    Sentry.captureException(error, {
      tags: { route: 'api:study-session', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { sessionId, cardsReviewed, correctCount, incorrectCount } =
      await request.json();
    const user = await getAuthenticatedUser();

    const session = await Sentry.startSpan({ name: 'db:session-update', op: 'db' }, async () => {
      return db.studySession.update({
        where: { id: sessionId, userId: user.id },
        data: {
          completedAt: new Date(),
          cardsReviewed: cardsReviewed || 0,
          correctCount: correctCount || 0,
          incorrectCount: incorrectCount || 0,
          accuracyRate: ((correctCount || 0) / (((correctCount || 0) + (incorrectCount || 0)) || 1)) * 100,
        },
      });
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    log.error({ err: error }, 'Failed to update session');
    Sentry.captureException(error, {
      tags: { route: 'api:study-session', method: 'PATCH' },
    });
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
