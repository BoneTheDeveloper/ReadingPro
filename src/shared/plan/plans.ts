// The plan catalog: what each tier may use, and what Pro costs. The server
// enforces these numbers and the client shows the same ones.
import { z } from "zod";

export const PlanTier = { FREE: "FREE", PRO: "PRO" } as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const METERED_FEATURES = [
  "passage_import",
  "artifact_generate",
  "chat_message",
  "ai_meaning",
  "set_generate",
] as const;
export type MeteredFeature = (typeof METERED_FEATURES)[number];

export type QuotaPeriod = "month" | "day";

export const FEATURE_PERIOD: Record<MeteredFeature, QuotaPeriod> = {
  passage_import: "month",
  artifact_generate: "month",
  chat_message: "day",
  ai_meaning: "month",
  set_generate: "month",
};

/** A limit of 0 means the feature is not part of the tier at all. */
export const PLAN_QUOTAS: Record<PlanTier, Record<MeteredFeature, number>> = {
  FREE: {
    passage_import: 10,
    artifact_generate: 5,
    chat_message: 20,
    ai_meaning: 0,
    set_generate: 0,
  },
  PRO: {
    passage_import: 200,
    artifact_generate: 100,
    chat_message: 200,
    ai_meaning: 500,
    set_generate: 30,
  },
};

export const PRO_PLANS = {
  PRO_MONTHLY: { code: "PRO_MONTHLY", months: 1, amount: 49_000 },
  PRO_YEARLY: { code: "PRO_YEARLY", months: 12, amount: 490_000 },
} as const;
export type ProPlanCode = keyof typeof PRO_PLANS;
export const PRO_PLAN_CODES = Object.keys(PRO_PLANS) as [ProPlanCode, ...ProPlanCode[]];

/** Pro ends this many days ahead → the UI warns that it is about to expire. */
export const EXPIRING_SOON_DAYS = 7;

export const CheckoutInputSchema = z.object({ planCode: z.enum(PRO_PLAN_CODES) });
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export const PaymentOrderIdParamSchema = z.object({ id: z.uuid() });

const UsageSchema = z.object({
  feature: z.enum(METERED_FEATURES),
  period: z.enum(["month", "day"]),
  used: z.number().int(),
  limit: z.number().int(),
  resetsAt: z.coerce.date(),
});
export type Usage = z.infer<typeof UsageSchema>;

export const SubscriptionStatusSchema = z.object({
  tier: z.enum(["FREE", "PRO"]),
  /** none: never paid · active · expiring: ends within EXPIRING_SOON_DAYS · expired · complimentary: granted without payment. */
  state: z.enum(["none", "active", "expiring", "expired", "complimentary"]),
  currentPeriodStart: z.coerce.date().nullable(),
  currentPeriodEnd: z.coerce.date().nullable(),
  daysLeft: z.number().int().nullable(),
  usage: z.array(UsageSchema),
});
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const PaymentOrderSchema = z.object({
  id: z.uuid(),
  planCode: z.enum(PRO_PLAN_CODES),
  amount: z.number().int(),
  months: z.number().int(),
  paymentCode: z.string(),
  status: z.enum(["PENDING", "PAID", "EXPIRED"]),
  expiresAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type PaymentOrder = z.infer<typeof PaymentOrderSchema>;

export const CheckoutSchema = z.object({
  order: PaymentOrderSchema,
  qrUrl: z.string(),
  bank: z.object({ code: z.string(), accountNumber: z.string(), accountName: z.string() }),
});
export type Checkout = z.infer<typeof CheckoutSchema>;

export const PaymentOrderListSchema = z.array(PaymentOrderSchema);
