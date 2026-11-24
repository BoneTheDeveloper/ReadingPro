import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import type { PaymentOrder } from "@/shared/plan/plans";
import { subscriptionQueries } from "../api/queries";
import { formatDateTime, formatVnd, PLAN_LABELS } from "../lib/labels";

const STATUS_TEXT: Record<PaymentOrder["status"], { label: string; className: string }> = {
  PAID: { label: "Đã thanh toán", className: "text-emerald-700" },
  PENDING: { label: "Chờ thanh toán", className: "text-orange-700" },
  EXPIRED: { label: "Hết hạn", className: "text-muted-foreground" },
};

export function PaymentHistory() {
  const { data } = useQuery(subscriptionQueries.orders());
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử thanh toán</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {data.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{PLAN_LABELS[order.planCode].name}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{order.paymentCode}</span>
              </span>
              <span className="tabular-nums">{formatVnd(order.amount)}</span>
              <span className="text-muted-foreground">{formatDateTime(order.paidAt ?? order.createdAt)}</span>
              <span className={STATUS_TEXT[order.status].className}>{STATUS_TEXT[order.status].label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
