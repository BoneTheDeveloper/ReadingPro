import { NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db/client';
import { getDueCards } from '@/lib/db/card-review-queries';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:cards:due');

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const userDb = withUserContext(user.id);
    const dueCards = await getDueCards(userDb);

    return NextResponse.json({ success: true, data: dueCards });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch due cards');
    return NextResponse.json(
      { error: 'Failed to fetch due cards' },
      { status: 500 }
    );
  }
}
