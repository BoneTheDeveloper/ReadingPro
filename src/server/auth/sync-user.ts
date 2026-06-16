import 'server-only';
import { db } from '@/server/db/client'

export async function syncUser(authId: string, email?: string, name?: string, avatarUrl?: string) {
  return db.userProfile.upsert({
    where: { id: authId },
    update: { email: email || null, name: name || null, avatarUrl: avatarUrl || null },
    create: { id: authId, email: email || null, name: name || null, avatarUrl: avatarUrl || null },
  })
}
