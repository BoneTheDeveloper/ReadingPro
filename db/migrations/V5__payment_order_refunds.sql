-- A paid order can be refunded (done by hand in the bank for now). The order
-- keeps its history row; "refundedAt" records when the money went back.
ALTER TABLE "PaymentOrder" DROP CONSTRAINT "PaymentOrder_status_check";
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_status_check"
    CHECK ("status" IN ('PENDING', 'PAID', 'REFUNDED'));
ALTER TABLE "PaymentOrder" ADD COLUMN "refundedAt" TIMESTAMPTZ(3);
