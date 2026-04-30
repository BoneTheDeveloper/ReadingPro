import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getDueCards } from '@/lib/db/utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:cards:due');

const DEMO_USER_EMAIL = 'demo@example.com';

export async function GET() {
  try {
    const user = await db.user.upsert({
      where: { email: DEMO_USER_EMAIL },
      update: {},
      create: { email: DEMO_USER_EMAIL, name: 'Demo User' },
    });

    const dueCards = await getDueCards(user.id);

    return NextResponse.json({ success: true, data: dueCards });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch due cards');
    return NextResponse.json(
      { error: 'Failed to fetch due cards' },
      { status: 500 }
    );
  }
}
