import { NextResponse } from 'next/server';
import { getDueCards } from '@/lib/db/card-review-queries';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { isAuthenticationRequiredError } from '@/lib/api/route-errors';
import { createModuleLogger } from '@/lib/core/logger';
import { toCardReviewDto } from '@/lib/study/shared/study-response-schema';

const log = createModuleLogger('api:cards:due');

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const dueCards = await getDueCards(user.id);

    return NextResponse.json({ success: true, data: dueCards.map(toCardReviewDto) });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

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
