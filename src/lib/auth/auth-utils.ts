import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createServerActionClient } from '@/lib/supabase/server';
import { createModuleLogger } from '@/lib/core/logger';
import { getCachedProfile, setCachedProfile } from './auth-cache';

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

    // Fast path: getSession() is a local JWT decode (no network call)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const cached = getCachedProfile(session.access_token);
      if (cached) return cached;
    }

    // Slow path: validate token with Supabase + fetch/create profile
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      log.error({ error }, 'Failed to get authenticated user');
      throw error;
    }

    if (!user) {
      return null;
    }

    const profile = await ensureProfile(user);

    if (session?.access_token) {
      setCachedProfile(session.access_token, profile);
    }

    return profile;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error({ err }, 'Failed to get current user');
    Sentry.captureException(err, {
      tags: { operation: 'auth:get-current-user' }
    });
    throw err;
  }
}

async function ensureProfile(supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  return Sentry.startSpan({ name: 'db:ensure-profile', op: 'db' }, async () => {
    let profile = await db.userProfile.findUnique({
      where: { id: supabaseUser.id }
    });

    if (!profile) {
      profile = await db.userProfile.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email || null,
          name: (supabaseUser.user_metadata?.name as string) || (supabaseUser.user_metadata?.full_name as string) || null,
          avatarUrl: (supabaseUser.user_metadata?.avatar_url as string) || null,
        }
      });
      log.info({ userId: profile.id }, 'Created profile from Supabase auth');
    }

    return profile;
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
