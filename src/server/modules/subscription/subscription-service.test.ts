import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import app from "@/server/app";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import { PLAN_QUOTAS } from "@/shared/plan/plans";
import {
  consumeQuota,
  createCheckoutForUser,
  extractPaymentCode,
  getPaymentOrderForUser,
  getSubscriptionStatus,
  getUserTier,
  handleSepayWebhook,
} from "./subscription-service";

const API_KEY = "test-sepay-key";
const userIds: string[] = [];
let nextTransactionId = Date.now() * 1000;

beforeEach(() => {
  process.env.SEPAY_BANK_CODE = "MB";
  process.env.SEPAY_BANK_ACCOUNT = "0123456789";
  process.env.SEPAY_ACCOUNT_NAME = "READING PRO";
  process.env.SEPAY_WEBHOOK_API_KEY = API_KEY;
});

afterEach(async () => {
  const ids = [...userIds];
  await pool.query(
    `DELETE FROM "SepayTransaction" WHERE "orderId" IN (SELECT "id" FROM "PaymentOrder" WHERE "userId" = ANY($1::text[]))
        OR "content" LIKE 'test-%'`,
    [ids],
  );
  await deleteTestUsers(userIds);
});

async function newUser(tier: "FREE" | "PRO" = "FREE") {
  const id = await createTestUser({ tier });
  userIds.push(id);
  return id;
}

/** The body SePay posts for an incoming transfer. */
function sepayPayload(overrides: Partial<{ content: string; transferAmount: number; transferType: string; id: number }>) {
  return {
    id: nextTransactionId++,
    gateway: "MBBank",
    transactionDate: "2026-11-24 10:00:00",
    accountNumber: "0123456789",
    subAccount: null,
    code: null,
    content: "test-transfer",
    transferType: "in",
    description: "BankAPINotify",
    transferAmount: 49000,
    accumulated: 0,
    referenceCode: "FT26328000001",
    ...overrides,
  };
}

const rejectionReason = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: { reason?: string }) => error.reason,
  );

describe("quota", () => {
  it("counts uses up to the Free limit, then refuses with the reset time", async () => {
    const userId = await newUser();
    const limit = PLAN_QUOTAS.FREE.artifact_generate;
    for (let i = 0; i < limit; i++) await consumeQuota(userId, "artifact_generate");

    const error = await consumeQuota(userId, "artifact_generate").catch((e) => e);
    expect(error.reason).toBe("plan.quota_exceeded");
    expect(error.details).toMatchObject({ feature: "artifact_generate", limit, period: "month" });

    const status = await getSubscriptionStatus(userId);
    expect(status.usage.find((u) => u.feature === "artifact_generate")).toMatchObject({ used: limit, limit });
  });

  it("does not overshoot when uses arrive in parallel", async () => {
    const userId = await newUser();
    const limit = PLAN_QUOTAS.FREE.chat_message;
    const results = await Promise.allSettled(
      Array.from({ length: limit + 5 }, () => consumeQuota(userId, "chat_message")),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(limit);
  });

  it("treats a Pro-only feature as plan.pro_required on Free", async () => {
    const userId = await newUser();
    expect(await rejectionReason(consumeQuota(userId, "ai_meaning"))).toBe("plan.pro_required");
  });

  it("gives a complimentary Pro user the Pro limits", async () => {
    const userId = await newUser("PRO");
    await consumeQuota(userId, "ai_meaning");
    const status = await getSubscriptionStatus(userId);
    expect(status).toMatchObject({ tier: "PRO", state: "complimentary" });
    expect(status.usage.find((u) => u.feature === "ai_meaning")).toMatchObject({ used: 1, limit: PLAN_QUOTAS.PRO.ai_meaning });
  });
});

describe("checkout and SePay webhook", () => {
  it("activates Pro when the matching transfer arrives, once", async () => {
    const userId = await newUser();
    const { order, qrUrl } = await createCheckoutForUser(userId, "PRO_MONTHLY");
    expect(order).toMatchObject({ status: "PENDING", amount: 49000, months: 1 });
    expect(qrUrl).toContain(`des=${order.paymentCode}`);
    expect(qrUrl).toContain("amount=49000");

    // Banks often rewrite the note around the code.
    const payload = sepayPayload({ content: `MBVCB.123 ${order.paymentCode.toLowerCase()} chuyen tien` });
    expect(await handleSepayWebhook(payload)).toBe("MATCHED");
    expect(await handleSepayWebhook(payload)).toBe("DUPLICATE");

    expect((await getPaymentOrderForUser(userId, order.id)).status).toBe("PAID");
    const status = await getSubscriptionStatus(userId);
    expect(status).toMatchObject({ tier: "PRO", state: "active" });
    expect(status.daysLeft).toBeGreaterThanOrEqual(28);
    expect(await getUserTier(userId)).toBe("PRO");
  });

  it("extends an active subscription from its end, not from now", async () => {
    const userId = await newUser();
    const first = await createCheckoutForUser(userId, "PRO_MONTHLY");
    await handleSepayWebhook(sepayPayload({ content: first.order.paymentCode }));
    const end1 = (await getSubscriptionStatus(userId)).currentPeriodEnd!;

    const second = await createCheckoutForUser(userId, "PRO_YEARLY");
    await handleSepayWebhook(sepayPayload({ content: second.order.paymentCode, transferAmount: 490000 }));
    const end2 = (await getSubscriptionStatus(userId)).currentPeriodEnd!;

    const expected = new Date(end1);
    expected.setMonth(expected.getMonth() + 12);
    expect(Math.abs(end2.getTime() - expected.getTime())).toBeLessThan(2 * 24 * 60 * 60 * 1000);
  });

  it("keeps the order pending on an underpayment and ignores outgoing transfers", async () => {
    const userId = await newUser();
    const { order } = await createCheckoutForUser(userId, "PRO_MONTHLY");

    expect(await handleSepayWebhook(sepayPayload({ content: order.paymentCode, transferAmount: 10000 }))).toBe("UNDERPAID");
    expect(await handleSepayWebhook(sepayPayload({ content: order.paymentCode, transferType: "out" }))).toBe("IGNORED");
    expect(await handleSepayWebhook(sepayPayload({ content: "test-unrelated" }))).toBe("NO_ORDER");
    expect((await getPaymentOrderForUser(userId, order.id)).status).toBe("PENDING");
    expect(await getUserTier(userId)).toBe("FREE");
  });

  it("reports a lapsed subscription as expired and back on Free limits", async () => {
    const userId = await newUser();
    await pool.query(
      `INSERT INTO "Subscription" ("userId", "currentPeriodStart", "currentPeriodEnd")
       VALUES ($1, now() - interval '40 days', now() - interval '10 days')`,
      [userId],
    );
    const status = await getSubscriptionStatus(userId);
    expect(status).toMatchObject({ tier: "FREE", state: "expired", daysLeft: null });
  });

  it("finds the code in SePay's parsed code field or in the note", () => {
    expect(extractPaymentCode({ code: "RPROABCDEFGH", content: "x" })).toBe("RPROABCDEFGH");
    expect(extractPaymentCode({ code: null, content: "chuyen tien RPRO-ABCD EFGH" })).toBe("RPROABCDEFGH");
    expect(extractPaymentCode({ code: null, content: "no code here" })).toBeNull();
  });
});

describe("POST /api/webhooks/sepay", () => {
  const post = (body: unknown, authorization?: string) =>
    app.request("/api/webhooks/sepay", {
      method: "POST",
      headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
      body: JSON.stringify(body),
    });

  it("rejects a request without the API key", async () => {
    const res = await post(sepayPayload({}), "Apikey wrong");
    expect(res.status).toBe(401);
    expect((await res.json()).error.reason).toBe("payment.webhook_unauthorized");
  });

  it("answers success: true so SePay stops retrying", async () => {
    const userId = await newUser();
    const { order } = await createCheckoutForUser(userId, "PRO_MONTHLY");
    const res = await post(sepayPayload({ content: order.paymentCode }), `Apikey ${API_KEY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, outcome: "MATCHED" });
  });
});

describe("GET /api/subscription", () => {
  it("needs a session", async () => {
    const res = await app.request("/api/subscription");
    expect(res.status).toBe(401);
  });
});
