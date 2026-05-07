import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createServerActionClient } from '@/lib/supabase/server';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:study-session');

export async function POST(request: NextRequest) {
  try {
    const { passageId } = await request.json();

    const supabase = await createServerActionClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Sync user with database if needed
    let dbUser = await db.user.findUnique({
      where: { supabaseAuthId: user.id }
    });

    if (!dbUser) {
      // Check if user already exists by email (for migration)
      dbUser = await db.user.findUnique({
        where: { email: user.email }
      });

      if (dbUser) {
        // Link existing user with Supabase auth ID
        dbUser = await db.user.update({
          where: { id: dbUser.id },
          data: {
            supabaseAuthId: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0]
          }
        });
      } else {
        // Create new user
        dbUser = await db.user.create({
          data: {
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0],
            supabaseAuthId: user.id,
            targetLevel: 'B2' // default CEFR level
          }
        });
      }
    }

    const session = await Sentry.startSpan({ name: 'db:session-create', op: 'db' }, async () => {
      return db.studySession.create({
        data: {
          userId: dbUser.id,
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

    const total = (correctCount || 0) + (incorrectCount || 0);

    const session = await Sentry.startSpan({ name: 'db:session-update', op: 'db' }, async () => {
      return db.studySession.update({
        where: { id: sessionId },
        data: {
          completedAt: new Date(),
          cardsReviewed: cardsReviewed || 0,
          correctCount: correctCount || 0,
          incorrectCount: incorrectCount || 0,
          accuracyRate: total > 0 ? (correctCount / total) * 100 : null,
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
