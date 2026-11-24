import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { validate } from "@/server/lib/validate";
import { AppError } from "@/server/lib/errors";
import { requireSession } from "@/server/middleware/require-session";
import { CheckoutInputSchema, PaymentOrderIdParamSchema } from "@/shared/plan/plans";
import { requireSepayConfig } from "./sepay-config";
import {
  createCheckoutForUser,
  getPaymentOrderForUser,
  getSubscriptionStatus,
  handleSepayWebhook,
  listPaymentOrders,
  SepayWebhookSchema,
} from "./subscription-service";
import type { AppEnv, AuthEnv } from "@/server/env";

export const subscriptionRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/", async (c) => c.json(await getSubscriptionStatus(c.var.user.id)))
  .get("/orders", async (c) => c.json(await listPaymentOrders(c.var.user.id)))
  .post("/checkout", validate("json", CheckoutInputSchema), async (c) => {
    return c.json(await createCheckoutForUser(c.var.user.id, c.req.valid("json").planCode), 201);
  })
  .get("/orders/:id", validate("param", PaymentOrderIdParamSchema), async (c) => {
    return c.json(await getPaymentOrderForUser(c.var.user.id, c.req.valid("param").id));
  });

function sameSecret(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Public: SePay authenticates with `Authorization: Apikey <key>`. Answering
// `{ success: true }` (also for a repeat delivery) stops SePay's retries.
export const sepayWebhookRoutes = new Hono<AppEnv>().post(
  "/",
  async (c, next) => {
    const { webhookApiKey } = requireSepayConfig();
    if (!sameSecret(c.req.header("authorization") ?? "", `Apikey ${webhookApiKey}`)) {
      throw new AppError("payment.webhook_unauthorized", "Invalid SePay API key");
    }
    await next();
  },
  validate("json", SepayWebhookSchema),
  async (c) => {
    const outcome = await handleSepayWebhook(c.req.valid("json"));
    return c.json({ success: true, outcome });
  },
);
