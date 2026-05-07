import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createServerActionClient } from '@/lib/supabase/server';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('auth:utils');

export async function getAuthenticatedUser() {
  return Sentry.startSpan({ name: 'auth:get-user', op: 'auth' }, async () => {
    const user = await requireAuth();
    log.info({ userId: user.id, email: user.email }, 'Authenticated user retrieved');
    return user;
  });
}

export async function getCurrentUser() {
  try {
    const supabase = await createServerActionClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      log.error({ error }, 'Failed to get authenticated user');
      throw error;
    }

    if (!user) {
      return null;
    }

    // Sync user with local database if needed
    const dbUser = await syncUserWithDatabase(user);

    return dbUser;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error({ err }, 'Failed to get current user');
    Sentry.captureException(err, {
      tags: { operation: 'auth:get-current-user' }
    });
    throw err;
  }
}

export async function syncUserWithDatabase(supabaseUser: { id: string; email?: string | null; user_metadata?: { name?: string } }) {
  return Sentry.startSpan({ name: 'db:user-sync', op: 'db' }, async () => {
    let dbUser = await db.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id }
    });

    if (!dbUser) {
      // Check if user already exists by email (for migration)
      if (supabaseUser.email) {
        dbUser = await db.user.findUnique({
          where: { email: supabaseUser.email }
        });
      }

      if (dbUser) {
        // Link existing user with Supabase auth ID
        dbUser = await db.user.update({
          where: { id: dbUser.id },
          data: {
            supabaseAuthId: supabaseUser.id,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0]
          }
        });
        log.info({ userId: dbUser.id }, 'Linked existing user with Supabase auth');
      } else {
        // Create new user
        dbUser = await db.user.create({
          data: {
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'User'),
            supabaseAuthId: supabaseUser.id,
            targetLevel: 'B2' // default CEFR level
          }
        });
        log.info({ userId: dbUser.id }, 'Created new user from Supabase auth');
      }
    }

    return dbUser;
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}