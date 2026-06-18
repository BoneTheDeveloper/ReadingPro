import 'server-only';
import { type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { syncUser, deleteUserProfile } from '@/server/auth/sync-user';

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const u = evt.data;
      const email =
        u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ??
        u.email_addresses?.[0]?.email_address;
      const nameParts = [u.first_name, u.last_name].filter(Boolean);
      const name = nameParts.length > 0 ? nameParts.join(' ') : undefined;
      await syncUser(u.id, email, name, u.image_url);
      break;
    }
    case 'user.deleted': {
      if (evt.data.id) await deleteUserProfile(evt.data.id);
      break;
    }
  }

  return new Response('ok', { status: 200 });
}
