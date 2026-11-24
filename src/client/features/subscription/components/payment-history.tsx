import { useQuery } from "@tanstack/react-query";
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
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Lịch sử thanh toán</h2>
      <div className="rounded-2xl border border-border bg-surface p-5">
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
        ) : (
        <ul className="divide-y divide-border text-sm">
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
        )}
      </div>
    </section>
  );
}
