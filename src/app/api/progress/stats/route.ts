import { NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db/client';
import { getUserProgress } from '@/lib/db/card-review-queries';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:progress:stats');

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const userDb = withUserContext(user.id);
    const stats = await getUserProgress(userDb);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch progress stats');
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
