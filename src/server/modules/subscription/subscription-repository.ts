import { pool, type JsonValue, type Queryable } from "@/server/lib/db";
import type { MeteredFeature } from "@/shared/plan/plans";

export type SubscriptionRow = {
  userId: string;
  plan: "PRO";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
};

export type PaymentOrderRow = {
  id: string;
  userId: string;
  planCode: string;
  amount: number;
  months: number;
  paymentCode: string;
  status: "PENDING" | "PAID";
  expiresAt: Date;
  paidAt: Date | null;
  createdAt: Date;
};

const ORDER_COLUMNS = `"id", "userId", "planCode", "amount", "months", "paymentCode", "status",
  "expiresAt", "paidAt", "createdAt"`;

export async function findSubscription(userId: string, db: Queryable = pool): Promise<SubscriptionRow | null> {
  const { rows } = await db.query<SubscriptionRow>(
    `SELECT "userId", "plan", "currentPeriodStart", "currentPeriodEnd"
     FROM "Subscription" WHERE "userId" = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** The manual tier on "User" (set by an admin or a test); "PRO" grants Pro without a payment. */
export async function findUserTier(userId: string, db: Queryable = pool): Promise<string | null> {
  const { rows } = await db.query<{ tier: string | null }>(`SELECT "tier" FROM "User" WHERE "id" = $1`, [userId]);
  return rows[0]?.tier ?? null;
}

/**
 * Adds `months` of Pro. A lapsed or new subscription starts now; an active one
 * is extended from its current end, so paying early never loses days.
 */
export async function extendSubscription(
  userId: string,
  months: number,
  db: Queryable = pool,
): Promise<SubscriptionRow> {
  const { rows } = await db.query<SubscriptionRow>(
    `INSERT INTO "Subscription" ("userId", "plan", "currentPeriodStart", "currentPeriodEnd")
     VALUES ($1, 'PRO', now(), now() + make_interval(months => $2))
     ON CONFLICT ("userId") DO UPDATE SET
       "currentPeriodStart" = CASE WHEN "Subscription"."currentPeriodEnd" > now()
                                   THEN "Subscription"."currentPeriodStart" ELSE now() END,
       "currentPeriodEnd" = GREATEST("Subscription"."currentPeriodEnd", now()) + make_interval(months => $2),
       "updatedAt" = now()
     RETURNING "userId", "plan", "currentPeriodStart", "currentPeriodEnd"`,
    [userId, months],
  );
  return rows[0];
}

export async function insertPaymentOrder(
  input: { userId: string; planCode: string; amount: number; months: number; paymentCode: string; expiresAt: Date },
  db: Queryable = pool,
): Promise<PaymentOrderRow> {
  const { rows } = await db.query<PaymentOrderRow>(
    `INSERT INTO "PaymentOrder" ("userId", "planCode", "amount", "months", "paymentCode", "expiresAt")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${ORDER_COLUMNS}`,
    [input.userId, input.planCode, input.amount, input.months, input.paymentCode, input.expiresAt],
  );
  return rows[0];
}

export async function findPaymentOrderForUser(
  userId: string,
  id: string,
  db: Queryable = pool,
): Promise<PaymentOrderRow | null> {
  const { rows } = await db.query<PaymentOrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM "PaymentOrder" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/** The user's unpaid order for this plan whose QR is still shown, if any. */
export async function findOpenPaymentOrder(
  userId: string,
  planCode: string,
  db: Queryable = pool,
): Promise<PaymentOrderRow | null> {
  const { rows } = await db.query<PaymentOrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM "PaymentOrder"
     WHERE "userId" = $1 AND "planCode" = $2 AND "status" = 'PENDING' AND "expiresAt" > now()
     ORDER BY "createdAt" DESC LIMIT 1`,
    [userId, planCode],
  );
  return rows[0] ?? null;
}

/** Paid orders only: an abandoned checkout is not a payment. */
export async function listPaidOrdersForUser(userId: string, db: Queryable = pool): Promise<PaymentOrderRow[]> {
  const { rows } = await db.query<PaymentOrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM "PaymentOrder"
     WHERE "userId" = $1 AND "status" = 'PAID' ORDER BY "paidAt" DESC LIMIT 20`,
    [userId],
  );
  return rows;
}

/** Locks the order so two deliveries of one transfer cannot both apply it. */
export async function lockPaymentOrderByCode(paymentCode: string, db: Queryable): Promise<PaymentOrderRow | null> {
  const { rows } = await db.query<PaymentOrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM "PaymentOrder" WHERE "paymentCode" = $1 FOR UPDATE`,
    [paymentCode],
  );
  return rows[0] ?? null;
}

export async function markPaymentOrderPaid(id: string, db: Queryable): Promise<void> {
  await db.query(
    `UPDATE "PaymentOrder" SET "status" = 'PAID', "paidAt" = now(), "updatedAt" = now() WHERE "id" = $1`,
    [id],
  );
}

type SepayTransactionInsert = {
  id: number;
  transferType: string;
  transferAmount: number;
  content: string;
  referenceCode: string | null;
  payload: JsonValue;
};

/** Records a delivery; false when SePay already sent this transaction id. */
export async function insertSepayTransaction(input: SepayTransactionInsert, db: Queryable): Promise<boolean> {
  const { rowCount } = await db.query(
    `INSERT INTO "SepayTransaction"
       ("id", "outcome", "transferType", "transferAmount", "content", "referenceCode", "payload")
     VALUES ($1, 'NO_ORDER', $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT ("id") DO NOTHING`,
    [input.id, input.transferType, input.transferAmount, input.content, input.referenceCode, JSON.stringify(input.payload)],
  );
  return rowCount === 1;
}

export async function setSepayTransactionOutcome(
  id: number,
  outcome: "MATCHED" | "UNDERPAID" | "NO_ORDER" | "IGNORED",
  orderId: string | null,
  db: Queryable,
): Promise<void> {
  await db.query(`UPDATE "SepayTransaction" SET "outcome" = $2, "orderId" = $3 WHERE "id" = $1`, [id, outcome, orderId]);
}

/**
 * Counts one use when the period's count is still under `limit`. Returns the
 * new count, or null when the limit was already reached. Atomic, so parallel
 * requests cannot overshoot.
 */
export async function incrementUsage(
  userId: string,
  feature: MeteredFeature,
  periodKey: string,
  limit: number,
  db: Queryable = pool,
): Promise<number | null> {
  const { rows } = await db.query<{ count: number }>(
    `INSERT INTO "UsageCounter" ("userId", "feature", "periodKey", "count")
     SELECT $1, $2, $3, 1 WHERE $4 > 0
     ON CONFLICT ("userId", "feature", "periodKey") DO UPDATE SET
       "count" = "UsageCounter"."count" + 1, "updatedAt" = now()
       WHERE "UsageCounter"."count" < $4
     RETURNING "count"`,
    [userId, feature, periodKey, limit],
  );
  return rows[0]?.count ?? null;
}

export async function listUsage(
  userId: string,
  keys: { feature: MeteredFeature; periodKey: string }[],
  db: Queryable = pool,
): Promise<Map<MeteredFeature, number>> {
  const { rows } = await db.query<{ feature: MeteredFeature; count: number }>(
    `SELECT u."feature", u."count"
     FROM "UsageCounter" u
     JOIN unnest($2::text[], $3::text[]) AS k("feature", "periodKey")
       ON k."feature" = u."feature" AND k."periodKey" = u."periodKey"
     WHERE u."userId" = $1`,
    [userId, keys.map((k) => k.feature), keys.map((k) => k.periodKey)],
  );
  return new Map(rows.map((r) => [r.feature, r.count]));
}
