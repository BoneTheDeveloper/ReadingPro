import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserProgress } from '@/lib/db-utils';

const DEMO_USER_EMAIL = 'demo@example.com';

export async function GET() {
  try {
    const user = await db.user.upsert({
      where: { email: DEMO_USER_EMAIL },
      update: {},
      create: { email: DEMO_USER_EMAIL, name: 'Demo User' },
    });

    const stats = await getUserProgress(user.id);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
