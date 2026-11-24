-- Prepaid Pro subscriptions paid by VietQR bank transfer through SePay, and
-- the per-period usage counters behind the Free/Pro quotas.
--
-- The plan catalog and the quota limits live in src/shared/plan/plans.ts; the
-- database only stores what was bought and what was used.

-- One row per user who ever paid. Pro is active while "currentPeriodEnd" is
-- in the future; a new payment extends it from max(now, currentPeriodEnd).
CREATE TABLE "Subscription" (
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'PRO',
    "currentPeriodStart" TIMESTAMPTZ(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "Subscription_plan_check" CHECK ("plan" IN ('PRO'))
);

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A checkout: the amount and the transfer note ("paymentCode") the user's
-- bank app sends. "expiresAt" only hides the QR in the UI; a late transfer
-- that still carries the code is honoured.
CREATE TABLE "PaymentOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "paymentCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentOrder_status_check" CHECK ("status" IN ('PENDING', 'PAID')),
    CONSTRAINT "PaymentOrder_amount_check" CHECK ("amount" > 0 AND "months" > 0)
);

CREATE UNIQUE INDEX "PaymentOrder_paymentCode_key" ON "PaymentOrder"("paymentCode");
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt" DESC);

ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every webhook SePay delivered, keyed by SePay's transaction id so a retry
-- or a manual resend is recorded once and applied once.
CREATE TABLE "SepayTransaction" (
    "id" BIGINT NOT NULL,
    "orderId" UUID,
    -- MATCHED, UNDERPAID, NO_ORDER or IGNORED (an outgoing transfer).
    "outcome" TEXT NOT NULL,
    "transferType" TEXT NOT NULL,
    "transferAmount" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "referenceCode" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SepayTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SepayTransaction_outcome_check"
        CHECK ("outcome" IN ('MATCHED', 'UNDERPAID', 'NO_ORDER', 'IGNORED'))
);

CREATE INDEX "SepayTransaction_orderId_idx" ON "SepayTransaction"("orderId");

ALTER TABLE "SepayTransaction" ADD CONSTRAINT "SepayTransaction_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- How often a user used a metered feature in one period. "periodKey" is the
-- Vietnam-time calendar month ("M:2026-11") or day ("D:2026-11-24").
CREATE TABLE "UsageCounter" (
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("userId", "feature", "periodKey")
);

ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
