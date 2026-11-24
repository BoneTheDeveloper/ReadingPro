import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { cn } from "@/client/lib/utils";
import { getErrorMessage } from "@/client/lib/api/error-message";
import type { SubscriptionStatus, Usage } from "@/shared/plan/plans";
import { subscriptionQueries } from "../api/queries";
import { FEATURE_LABELS, formatDate, STATE_LABELS } from "../lib/labels";

const STATE_BADGE: Record<SubscriptionStatus["state"], string> = {
  none: "bg-muted text-ink-2",
  active: "bg-emerald-100 text-emerald-800",
  expiring: "bg-orange-100 text-orange-800",
  expired: "bg-red-100 text-red-800",
  complimentary: "bg-emerald-100 text-emerald-800",
};

/** Plan, subscription state, period end and every quota with its usage. */
export function SubscriptionOverview({ showManageLink = false }: { showManageLink?: boolean }) {
  const { data, error, isPending } = useQuery(subscriptionQueries.status());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Gói đăng ký
          {data && (
            <>
              <Badge variant={data.tier === "PRO" ? "default" : "secondary"}>
                {data.tier === "PRO" && <Crown />}
                {data.tier === "PRO" ? "Pro" : "Free"}
              </Badge>
              <Badge className={STATE_BADGE[data.state]}>{STATE_LABELS[data.state]}</Badge>
            </>
          )}
        </CardTitle>
        <CardDescription>{data ? periodText(data) : "Trạng thái gói và lượt sử dụng của bạn"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        {data && (
          <>
            {data.state === "expiring" && (
              <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
                Gói Pro còn {data.daysLeft} ngày. Gia hạn ngay để không bị gián đoạn, thời gian mới được cộng nối tiếp.
              </p>
            )}
            {data.state === "expired" && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                Gói Pro đã hết hạn ngày {formatDate(data.currentPeriodEnd!)}. Bạn đang dùng giới hạn của gói Free.
              </p>
            )}
            <ul className="space-y-3">
              {data.usage.map((usage) => (
                <UsageRow key={usage.feature} usage={usage} />
              ))}
            </ul>
            {showManageLink && (
              <Button asChild variant={data.tier === "PRO" ? "secondary" : "coral"}>
                <Link to="/billing">{data.tier === "PRO" ? "Gia hạn / xem lịch sử thanh toán" : "Nâng cấp Pro"}</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function periodText(data: SubscriptionStatus): string {
  if (data.state === "complimentary") return "Tài khoản được cấp quyền Pro, không có hạn dùng.";
  if (data.state === "none") return "Bạn đang dùng gói Free. Lượt dùng được làm mới theo ngày hoặc tháng.";
  const end = formatDate(data.currentPeriodEnd!);
  if (data.state === "expired") return `Hết hạn ngày ${end}.`;
  return `Hiệu lực từ ${formatDate(data.currentPeriodStart!)} đến ${end} · còn ${data.daysLeft} ngày.`;
}

function UsageRow({ usage }: { usage: Usage }) {
  const locked = usage.limit === 0;
  const ratio = locked ? 0 : Math.min(usage.used / usage.limit, 1);
  const unit = usage.period === "day" ? "hôm nay" : "tháng này";

  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{FEATURE_LABELS[usage.feature]}</span>
        <span className={cn("tabular-nums text-muted-foreground", ratio >= 1 && "font-semibold text-destructive")}>
          {locked ? "Chỉ có ở Pro" : `${usage.used}/${usage.limit} ${unit}`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={FEATURE_LABELS[usage.feature]}
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.used}
      >
        <div
          className={cn("h-full rounded-full", ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-orange-500" : "bg-primary")}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {!locked && (
        <p className="text-xs text-muted-foreground">Làm mới lúc {usage.resetsAt.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
      )}
    </li>
  );
}
