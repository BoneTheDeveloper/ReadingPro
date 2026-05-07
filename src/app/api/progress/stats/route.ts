import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getUserProgress } from '@/lib/db/utils';
import { createServerActionClient } from '@/lib/supabase/server';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('api:progress:stats');

export async function GET() {
  try {
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

    const stats = await getUserProgress(dbUser.id);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch progress stats');
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
