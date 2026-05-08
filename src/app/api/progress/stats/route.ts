import { NextResponse } from 'next/server';
import { getUserProgress } from '@/lib/db/card-review-queries';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:progress:stats');

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const stats = await getUserProgress(user.id);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch progress stats');
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
