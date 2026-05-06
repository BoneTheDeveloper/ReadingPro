import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('actions:study-shared');

const DEMO_USER_EMAIL = 'demo@example.com';

export async function getOrCreateDemoUser() {
  return Sentry.startSpan({ name: 'db:user-lookup', op: 'db' }, async () => {
    let user = await db.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
    if (!user) {
      log.info({ email: DEMO_USER_EMAIL }, 'Creating demo user');
      user = await db.user.create({ data: { email: DEMO_USER_EMAIL, name: 'Demo User' } });
    }
    return user;
  });
}
