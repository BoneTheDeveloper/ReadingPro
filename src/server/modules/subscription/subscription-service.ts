import { randomInt } from "node:crypto";
import { z } from "zod";
import { withTransaction, type JsonValue } from "@/server/lib/db";
import { AppError } from "@/server/lib/errors";
import { log } from "@/server/lib/logger";
import {
  EXPIRING_SOON_DAYS,
  FEATURE_PERIOD,
  METERED_FEATURES,
  PLAN_QUOTAS,
  PRO_PLANS,
  type Checkout,
  type MeteredFeature,
  type PaymentOrder,
  type PlanTier,
  type ProPlanCode,
  type SubscriptionStatus,
} from "@/shared/plan/plans";
import { quotaWindow } from "./quota-period";
import { buildVietQrUrl, requireSepayConfig } from "./sepay-config";
import {
  extendSubscription,
  findPaymentOrderForUser,
  findSubscription,
  findUserPlanFields,
  incrementUsage,
  insertPaymentOrder,
  insertSepayTransaction,
  findOpenPaymentOrder,
  listPaidOrdersForUser,
  listUsage,
  lockPaymentOrderByCode,
  markPaymentOrderPaid,
  setSepayTransactionOutcome,
  type PaymentOrderRow,
} from "./subscription-repository";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How long the checkout QR is shown; a late transfer with the code still counts. */
const ORDER_TTL_MS = 30 * 60 * 1000;

// ── Entitlements ────────────────────────────────────────────────────────────

/**
 * The user's plan at `now`. Pro while a paid period runs, or when
 * "User"."tier" grants it outright. `cycleAnchor` starts the monthly quota
 * cycles: the paid period's start, otherwise the sign-up time.
 */
async function loadPlan(userId: string, now: Date) {
  const [subscription, user] = await Promise.all([findSubscription(userId), findUserPlanFields(userId)]);
  const paid = subscription !== null && subscription.currentPeriodEnd > now;
  const complimentary = !paid && user?.tier === "PRO";
  const tier: PlanTier = paid || complimentary ? "PRO" : "FREE";
  const cycleAnchor = paid ? subscription.currentPeriodStart : (user?.createdAt ?? now);
  return { tier, subscription, paid, complimentary, cycleAnchor };
}

export async function getUserTier(userId: string, now = new Date()): Promise<PlanTier> {
  return (await loadPlan(userId, now)).tier;
}

/**
 * Counts one use of `feature` against the user's plan, before the work runs.
 * A feature the tier does not include throws `plan.pro_required`; a used-up
 * quota throws `plan.quota_exceeded` with the limit and the reset time.
 */
export async function consumeQuota(userId: string, feature: MeteredFeature, now = new Date()): Promise<void> {
  const { tier, cycleAnchor } = await loadPlan(userId, now);
  const limit = PLAN_QUOTAS[tier][feature];
  if (limit === 0) throw new AppError("plan.pro_required", `${feature} requires the Pro tier`);

  const period = FEATURE_PERIOD[feature];
  const window = quotaWindow(period, cycleAnchor, now);
  const count = await incrementUsage(userId, feature, window.key, limit);
  if (count === null) {
    throw new AppError("plan.quota_exceeded", `${feature} quota of ${limit} per ${period} is used up`, {
      feature,
      limit,
      period,
      resetsAt: window.resetsAt.toISOString(),
    });
  }
}

export async function getSubscriptionStatus(userId: string, now = new Date()): Promise<SubscriptionStatus> {
  const { tier, subscription, paid: active, complimentary, cycleAnchor } = await loadPlan(userId, now);

  const daysLeft = active && subscription ? Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS) : null;
  const state: SubscriptionStatus["state"] = active
    ? daysLeft! <= EXPIRING_SOON_DAYS ? "expiring" : "active"
    : complimentary ? "complimentary"
    : subscription ? "expired"
    : "none";

  const windows = new Map(
    METERED_FEATURES.map((feature) => [feature, quotaWindow(FEATURE_PERIOD[feature], cycleAnchor, now)]),
  );
  const used = await listUsage(
    userId,
    METERED_FEATURES.map((feature) => ({ feature, periodKey: windows.get(feature)!.key })),
  );

  return {
    tier,
    state,
    currentPeriodStart: subscription?.currentPeriodStart ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    daysLeft,
    usage: METERED_FEATURES.map((feature) => ({
      feature,
      period: FEATURE_PERIOD[feature],
      used: used.get(feature) ?? 0,
      limit: PLAN_QUOTAS[tier][feature],
      resetsAt: windows.get(feature)!.resetsAt,
    })),
  };
}

// ── Checkout ────────────────────────────────────────────────────────────────

/** Transfer notes carry this prefix; set the same prefix as the payment code in SePay. */
const PAYMENT_CODE_PREFIX = "RPRO";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAYMENT_CODE_PATTERN = new RegExp(`${PAYMENT_CODE_PREFIX}[${CODE_ALPHABET}]{8}`);

function newPaymentCode(): string {
  let code = PAYMENT_CODE_PREFIX;
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

function toPaymentOrder(row: PaymentOrderRow, now = new Date()): PaymentOrder {
  return {
    id: row.id,
    planCode: row.planCode as ProPlanCode,
    amount: row.amount,
    months: row.months,
    paymentCode: row.paymentCode,
    status: row.status === "PENDING" && row.expiresAt <= now ? "EXPIRED" : row.status,
    expiresAt: row.expiresAt,
    paidAt: row.paidAt,
    refundedAt: row.refundedAt,
    createdAt: row.createdAt,
  };
}

function toCheckout(row: PaymentOrderRow): Checkout {
  const config = requireSepayConfig();
  return {
    order: toPaymentOrder(row),
    qrUrl: buildVietQrUrl(config, row.amount, row.paymentCode),
    bank: { code: config.bankCode, accountNumber: config.accountNumber, accountName: config.accountName },
  };
}

export async function createCheckoutForUser(userId: string, planCode: ProPlanCode): Promise<Checkout> {
  requireSepayConfig();
  // Leaving the checkout page and choosing the same plan again resumes that
  // order instead of piling up unpaid ones.
  const open = await findOpenPaymentOrder(userId, planCode);
  if (open) return toCheckout(open);

  const plan = PRO_PLANS[planCode];
  const row = await insertPaymentOrder({
    userId,
    planCode,
    amount: plan.amount,
    months: plan.months,
    paymentCode: newPaymentCode(),
    expiresAt: new Date(Date.now() + ORDER_TTL_MS),
  });
  return toCheckout(row);
}

/** The checkout page's data: the order with its QR, reloadable by URL. */
export async function getCheckoutForUser(userId: string, id: string): Promise<Checkout> {
  const row = await findPaymentOrderForUser(userId, id);
  if (!row) throw new AppError("payment.order_not_found", `No payment order ${id}`);
  return toCheckout(row);
}

export async function getPaymentOrderForUser(userId: string, id: string): Promise<PaymentOrder> {
  const row = await findPaymentOrderForUser(userId, id);
  if (!row) throw new AppError("payment.order_not_found", `No payment order ${id}`);
  return toPaymentOrder(row);
}

export async function listPaymentOrders(userId: string): Promise<PaymentOrder[]> {
  return (await listPaidOrdersForUser(userId)).map((row) => toPaymentOrder(row));
}

// ── SePay webhook ───────────────────────────────────────────────────────────

/** The fields of SePay's transaction webhook that matter here; others are kept in the payload. */
export const SepayWebhookSchema = z.looseObject({
  id: z.number().int(),
  transferType: z.string(),
  transferAmount: z.number(),
  content: z.string().nullish(),
  code: z.string().nullish(),
  referenceCode: z.string().nullish(),
});
export type SepayWebhook = z.infer<typeof SepayWebhookSchema>;

export type WebhookOutcome = "MATCHED" | "UNDERPAID" | "NO_ORDER" | "IGNORED" | "DUPLICATE";

/** Finds our payment code in SePay's parsed `code` or anywhere in the transfer note. */
export function extractPaymentCode(payload: Pick<SepayWebhook, "code" | "content">): string | null {
  for (const text of [payload.code, payload.content]) {
    const match = text?.toUpperCase().replace(/[^A-Z0-9]/g, "").match(PAYMENT_CODE_PATTERN);
    if (match) return match[0];
  }
  return null;
}

/**
 * Applies one SePay delivery exactly once: the transaction id is recorded in
 * the same transaction that marks the order paid and extends Pro.
 */
export async function handleSepayWebhook(payload: SepayWebhook): Promise<WebhookOutcome> {
  return withTransaction(async (tx) => {
    const fresh = await insertSepayTransaction(
      {
        id: payload.id,
        transferType: payload.transferType,
        transferAmount: payload.transferAmount,
        content: payload.content ?? "",
        referenceCode: payload.referenceCode ?? null,
        payload: payload as JsonValue,
      },
      tx,
    );
    if (!fresh) return "DUPLICATE";

    const outcome = await applyTransaction(payload, tx);
    await setSepayTransactionOutcome(payload.id, outcome.outcome, outcome.orderId, tx);
    log.info({ sepayTransactionId: payload.id, ...outcome }, "sepay webhook applied");
    return outcome.outcome;
  });
}

async function applyTransaction(
  payload: SepayWebhook,
  tx: Parameters<typeof lockPaymentOrderByCode>[1],
): Promise<{ outcome: Exclude<WebhookOutcome, "DUPLICATE">; orderId: string | null }> {
  if (payload.transferType !== "in") return { outcome: "IGNORED", orderId: null };

  const code = extractPaymentCode(payload);
  const order = code ? await lockPaymentOrderByCode(code, tx) : null;
  if (!order) return { outcome: "NO_ORDER", orderId: null };
  // A transfer for an order already paid or refunded is kept on record for a manual refund.
  if (order.status !== "PENDING") return { outcome: "NO_ORDER", orderId: order.id };
  if (payload.transferAmount < order.amount) return { outcome: "UNDERPAID", orderId: order.id };

  await markPaymentOrderPaid(order.id, tx);
  await extendSubscription(order.userId, order.months, tx);
  return { outcome: "MATCHED", orderId: order.id };
}
