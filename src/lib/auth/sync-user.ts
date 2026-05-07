import { db } from '@/lib/db/client'

export async function syncUser(supabaseAuthId: string, email: string, name?: string) {
  return db.user.upsert({
    where: { supabaseAuthId },
    update: { email, name },
    create: { email, name: name || email.split('@')[0], supabaseAuthId },
  })
}
