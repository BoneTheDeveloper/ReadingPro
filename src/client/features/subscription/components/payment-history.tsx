import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/client/lib/store/hooks";
import { selectSessionUser } from "@/client/lib/store/session-slice";
import { cn } from "@/client/lib/utils";
import type { PaymentOrder } from "@/shared/plan/plans";
import { subscriptionQueries } from "../api/queries";
import { downloadInvoicePdf } from "../lib/invoice-pdf";
import { formatDate, formatVnd } from "../lib/labels";

const STATUS = {
  PAID: { label: "Đã thanh toán", className: "bg-success-soft text-success" },
  REFUNDED: { label: "Đã hoàn tiền", className: "bg-muted text-muted-foreground" },
} as const;

/** Paid and refunded payments, newest first: date, total, status and the invoice PDF. */
export function PaymentHistory() {
  const { data } = useQuery(subscriptionQueries.orders());
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Lịch sử thanh toán</h2>
      <div className="rounded-lg border border-border bg-surface">
        {!data || data.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-medium">Ngày</th>
                <th scope="col" className="px-5 py-3 font-medium">Tổng</th>
                <th scope="col" className="px-5 py-3 font-medium">Trạng thái</th>
                <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Hóa đơn</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-3">{formatDate(order.paidAt ?? order.createdAt)}</td>
                  <td className="px-5 py-3 tabular-nums">{formatVnd(order.amount)}</td>
                  <td className="px-5 py-3">
                    {(order.status === "PAID" || order.status === "REFUNDED") && (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[order.status].className)}>
                        {STATUS[order.status].label}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right"><InvoiceButton order={order} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function InvoiceButton({ order }: { order: PaymentOrder }) {
  const user = useAppSelector(selectSessionUser);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || !user}
      aria-label={`Tải hóa đơn PDF ngày ${formatDate(order.paidAt ?? order.createdAt)}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-medium text-primary hover:bg-muted disabled:opacity-50"
      onClick={() => {
        if (!user) return;
        setBusy(true);
        downloadInvoicePdf(order, user)
          .catch(() => toast.error("Không tạo được hóa đơn. Vui lòng thử lại."))
          .finally(() => setBusy(false));
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      PDF
    </button>
  );
}
