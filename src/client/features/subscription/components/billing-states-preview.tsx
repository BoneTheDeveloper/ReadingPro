// Development-only gallery of every settings state, rendered from sample
// statuses so each variant can be reviewed without a matching account.
import { FEATURE_PERIOD, METERED_FEATURES, PLAN_QUOTAS, type PaymentOrder, type PlanTier, type SubscriptionStatus } from "@/shared/plan/plans";
import { PaymentHistoryTable } from "./payment-history";
import { CurrentPlan, Section, UsageSummary } from "./settings-panels";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const at = (days: number) => new Date(now + days * DAY);

function status(
  tier: PlanTier,
  state: SubscriptionStatus["state"],
  period: { start: number; end: number } | null,
  usedRatio: number,
): SubscriptionStatus {
  return {
    tier,
    state,
    currentPeriodStart: period ? at(period.start) : null,
    currentPeriodEnd: period ? at(period.end) : null,
    daysLeft: period && period.end > 0 ? Math.ceil(period.end) : null,
    usage: METERED_FEATURES.map((feature) => {
      const limit = PLAN_QUOTAS[tier][feature];
      return {
        feature,
        period: FEATURE_PERIOD[feature],
        used: Math.min(limit, Math.round(limit * usedRatio)),
        limit,
        resetsAt: FEATURE_PERIOD[feature] === "day" ? new Date(now + 5 * 60 * 60 * 1000) : at(6),
      };
    }),
  };
}

const STATES: { title: string; data: SubscriptionStatus }[] = [
  { title: "Free · chưa từng mua", data: status("FREE", "none", null, 0.3) },
  { title: "Free · gần hết lượt (≥ 80%)", data: status("FREE", "none", null, 0.85) },
  { title: "Free · đã hết lượt", data: status("FREE", "none", null, 1) },
  { title: "Pro · đang hoạt động", data: status("PRO", "active", { start: -30, end: 335 }, 0.2) },
  { title: "Pro · sắp hết hạn (≤ 7 ngày)", data: status("PRO", "expiring", { start: -25, end: 5 }, 0.5) },
  { title: "Pro hết hạn · về Free", data: status("FREE", "expired", { start: -40, end: -10 }, 0.4) },
  { title: "Pro được cấp (không hạn)", data: status("PRO", "complimentary", null, 0.1) },
];

const order = (code: string, amount: number, months: number, paidDaysAgo: number, refundedDaysAgo?: number): PaymentOrder => ({
  id: crypto.randomUUID(),
  planCode: months === 12 ? "PRO_YEARLY" : "PRO_MONTHLY",
  amount,
  months,
  paymentCode: code,
  status: refundedDaysAgo === undefined ? "PAID" : "REFUNDED",
  expiresAt: at(-paidDaysAgo),
  paidAt: at(-paidDaysAgo),
  refundedAt: refundedDaysAgo === undefined ? null : at(-refundedDaysAgo),
  createdAt: at(-paidDaysAgo),
});

const HISTORY: PaymentOrder[] = [
  order("RPROPREVIEW1", 490_000, 12, 2),
  order("RPROPREVIEW2", 49_000, 1, 40, 35),
  order("RPROPREVIEW3", 49_000, 1, 70),
];

export function BillingStatesPreview() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trạng thái cài đặt gói (dev)</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dữ liệu mẫu, chỉ có khi chạy dev. Không gọi API.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {STATES.map(({ title, data }) => (
            <div key={title} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
              <Section title="Gói hiện tại"><CurrentPlan data={data} /></Section>
              <Section title="Mức sử dụng"><UsageSummary data={data} /></Section>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lịch sử · có giao dịch, gồm 1 hoàn tiền</p>
            <PaymentHistoryTable orders={HISTORY} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lịch sử · trống</p>
            <PaymentHistoryTable orders={[]} />
          </div>
        </div>
      </div>
    </div>
  );
}
