import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDueCards } from '@/lib/db-utils';

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
    console.error('Error fetching due cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch due cards' },
      { status: 500 }
    );
  }
}
