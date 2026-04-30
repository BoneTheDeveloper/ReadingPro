import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:study-session');

const DEMO_USER_EMAIL = 'demo@example.com';

export async function POST(request: NextRequest) {
  try {
    const { passageId } = await request.json();

    let user = await db.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
    if (!user) {
      user = await db.user.create({
        data: { email: DEMO_USER_EMAIL, name: 'Demo User' },
      });
    }

    const session = await db.studySession.create({
      data: {
        userId: user.id,
        passageId,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    log.error({ err: error }, 'Failed to create session');
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

    const total = (correctCount || 0) + (incorrectCount || 0);

    const session = await db.studySession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        cardsReviewed: cardsReviewed || 0,
        correctCount: correctCount || 0,
        incorrectCount: incorrectCount || 0,
        accuracyRate: total > 0 ? (correctCount / total) * 100 : null,
      },
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    log.error({ err: error }, 'Failed to update session');
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
