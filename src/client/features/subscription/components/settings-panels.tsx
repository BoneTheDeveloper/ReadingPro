import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { getErrorMessage } from "@/client/lib/api/error-message";
import type { SubscriptionStatus } from "@/shared/plan/plans";
import { subscriptionQueries } from "../api/queries";
import { formatDate, STATE_LABELS } from "../lib/labels";
import { PaymentHistory } from "./payment-history";
import { UsageMeters } from "./usage-meters";

const STATE_BADGE: Record<SubscriptionStatus["state"], string> = {
  none: "bg-muted text-ink-2",
  active: "bg-success-soft text-success",
  expiring: "bg-amber-soft text-amber-text",
  expired: "bg-destructive/10 text-destructive",
  complimentary: "bg-success-soft text-success",
};

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5">{children}</div>
    </section>
  );
}

function useStatus() {
  const query = useQuery(subscriptionQueries.status());
  const fallback = query.isPending ? (
    <p className="text-sm text-muted-foreground">Đang tải…</p>
  ) : query.error ? (
    <p className="text-sm text-destructive">{getErrorMessage(query.error)}</p>
  ) : null;
  return { data: query.data, fallback };
}

function periodLine(data: SubscriptionStatus): string {
  switch (data.state) {
    case "none":
      return "Lượt dùng làm mới theo ngày hoặc tháng. Nâng cấp để có hạn mức cao hơn.";
    case "complimentary":
      return "Tài khoản được cấp quyền Pro, không có ngày hết hạn.";
    case "expired":
      return `Pro đã hết hạn ngày ${formatDate(data.currentPeriodEnd!)}. Bạn đang dùng hạn mức của gói Free.`;
    default:
      return `Hết hạn ngày ${formatDate(data.currentPeriodEnd!)} (còn ${data.daysLeft} ngày). Không tự động gia hạn.`;
  }
}

/** The current plan with its expiry and the upgrade/renew action. */
export function CurrentPlan({ data }: { data: SubscriptionStatus }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-lg font-semibold">
          {data.tier === "PRO" && <Crown className="h-4 w-4 text-primary" aria-hidden />}
          Gói {data.tier === "PRO" ? "Pro" : "Free"}
          {/* The plan name already implies an active plan; the badge only flags a state worth noticing. */}
          {data.state !== "none" && data.state !== "active" && <Badge className={STATE_BADGE[data.state]}>{STATE_LABELS[data.state]}</Badge>}
        </p>
        <p className="text-sm text-muted-foreground">{periodLine(data)}</p>
      </div>
      {data.state !== "complimentary" && (
        <Button asChild variant={data.tier === "PRO" && data.state !== "expiring" ? "secondary" : "default"}>
          <Link to="/pricing">{data.tier === "PRO" ? "Gia hạn" : "Nâng cấp lên Pro"}</Link>
        </Button>
      )}
    </div>
  );
}

/** The quota meters, with an upgrade nudge on Free. */
export function UsageSummary({ data }: { data: SubscriptionStatus }) {
  return (
    <div className="space-y-5">
      <UsageMeters usage={data.usage} />
      {data.tier === "FREE" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-soft px-4 py-3 text-sm">
          <span>Cần nhiều lượt hơn? Pro tăng hạn mức tới 20 lần.</span>
          <Button asChild size="sm"><Link to="/pricing">Xem gói Pro</Link></Button>
        </div>
      )}
    </div>
  );
}

/** Settings → Billing: the current plan and the payment history. */
export function BillingSettings() {
  const { data, fallback } = useStatus();
  return (
    <div className="space-y-8">
      <Section title="Gói hiện tại">{data ? <CurrentPlan data={data} /> : fallback}</Section>
      <PaymentHistory />
    </div>
  );
}

/** Settings → Usage: every quota meter for the current period. */
export function UsageSettings() {
  const { data, fallback } = useStatus();
  return (
    <Section
      title="Mức sử dụng"
      description={data ? `Hạn mức của gói ${data.tier === "PRO" ? "Pro" : "Free"} trong kỳ hiện tại.` : undefined}
    >
      {data ? <UsageSummary data={data} /> : fallback}
    </Section>
  );
}
