import 'server-only';
import { db } from '@/server/db/client'

export async function syncUser(authId: string, email?: string, name?: string, avatarUrl?: string) {
  return db.userProfile.upsert({
    where: { id: authId },
    update: { email: email || null, name: name || null, avatarUrl: avatarUrl || null },
    create: { id: authId, email: email || null, name: name || null, avatarUrl: avatarUrl || null },
  })
}

// Guarantees the UserProfile FK target row exists before a write that depends on it.
// JWT already verified userId via getUserId(); no Clerk fetch needed.
// Email/name are backfilled later by the Clerk webhook.
export async function ensureUserProfile(userId: string): Promise<void> {
  await db.userProfile.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
}

// Hard-deletes the profile; FK onDelete: Cascade removes all user-scoped rows.
// Uses deleteMany so replayed webhook events (no row) are a no-op.
export async function deleteUserProfile(userId: string): Promise<void> {
  await db.userProfile.deleteMany({ where: { id: userId } });
}
