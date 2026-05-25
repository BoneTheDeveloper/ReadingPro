import { NextResponse } from 'next/server';
import { getDueCards } from '@/lib/db/card-review-queries';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:cards:due');

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const dueCards = await getDueCards(user.id);

    return NextResponse.json({ success: true, data: dueCards });
  } catch (error) {
    log.error(
      { err: error, context: { path: '/api/cards/due', method: 'GET' } },
      'Failed to fetch due cards',
    );
    return NextResponse.json(
      { error: 'Failed to fetch due cards' },
      { status: 500 }
    );
  }
}
