import "server-only";
import { type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { syncUser, deleteUserProfile } from "@/features/users/db/sync-user";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";

const MODULE = "api:webhooks:clerk";

export async function POST(req: NextRequest) {
  const log = createRequestLogger(
    MODULE,
    createRequestLogContext(req, "POST", "/api/webhooks/clerk"),
  );

  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    log.warn("invalid webhook signature");
    return new Response("Invalid signature", { status: 400 });
  }

  log.debug({ context: { eventType: evt.type } }, "processing webhook");

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const u = evt.data;
      const email =
        u.email_addresses?.find((e) => e.id === u.primary_email_address_id)
          ?.email_address ?? u.email_addresses?.[0]?.email_address;
      const nameParts = [u.first_name, u.last_name].filter(Boolean);
      const name = nameParts.length > 0 ? nameParts.join(" ") : undefined;
      await syncUser(u.id, email, name, u.image_url);
      break;
    }
    case "user.deleted": {
      if (evt.data.id) await deleteUserProfile(evt.data.id);
      break;
    }
  }

  log.info({ context: { eventType: evt.type } }, "webhook processed");
  return new Response("ok", { status: 200 });
}
