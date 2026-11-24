import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui/dialog";
import type { Checkout } from "@/shared/plan/plans";
import { subscriptionQueries, useRefreshSubscription } from "../api/queries";
import { formatVnd, PLAN_LABELS } from "../lib/labels";

/** The VietQR to scan, the transfer details, and a live status until SePay confirms the payment. */
export function CheckoutDialog({ checkout, onClose }: { checkout: Checkout | null; onClose: () => void }) {
  const orderQuery = useQuery({
    ...subscriptionQueries.order(checkout?.order.id ?? null),
    initialData: checkout?.order,
  });
  const refresh = useRefreshSubscription();
  const status = orderQuery.data?.status ?? "PENDING";
  const secondsLeft = useSecondsLeft(checkout?.order.expiresAt ?? null);

  useEffect(() => {
    if (status === "PAID") void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once when the order turns paid
  }, [status]);

  if (!checkout) return null;
  const { order, bank, qrUrl } = checkout;
  const expired = status === "EXPIRED" || (status === "PENDING" && secondsLeft === 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán {PLAN_LABELS[order.planCode].name}</DialogTitle>
        </DialogHeader>

        {status === "PAID" ? (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <p className="text-lg font-semibold">Thanh toán thành công</p>
            <p className="text-sm text-muted-foreground">Gói Pro của bạn đã được kích hoạt.</p>
            <Button onClick={onClose}>Đóng</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {expired ? (
              <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
                Mã QR đã hết hạn. Nếu bạn đã chuyển khoản đúng nội dung, gói vẫn được kích hoạt khi tiền về; nếu chưa, hãy tạo đơn mới.
              </p>
            ) : (
              <img src={qrUrl} alt="Mã VietQR thanh toán" className="mx-auto aspect-square w-64 rounded-lg border bg-white" />
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Ngân hàng</dt>
              <dd className="font-medium">{bank.code}</dd>
              <dt className="text-muted-foreground">Số tài khoản</dt>
              <dd><CopyValue value={bank.accountNumber} /></dd>
              <dt className="text-muted-foreground">Chủ tài khoản</dt>
              <dd className="font-medium">{bank.accountName}</dd>
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="font-semibold">{formatVnd(order.amount)}</dd>
              <dt className="text-muted-foreground">Nội dung</dt>
              <dd><CopyValue value={order.paymentCode} /></dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              Quét mã bằng app ngân hàng. Giữ nguyên nội dung chuyển khoản để hệ thống nhận diện tự động.
            </p>
            {!expired && (
              <p className="flex items-center gap-2 text-sm" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Đang chờ thanh toán… mã hết hạn sau {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function useSecondsLeft(until: Date | null): number {
  const compute = () => (until ? Math.max(0, Math.round((until.getTime() - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(compute);
  // The dialog is keyed by order, so a new deadline always mounts a fresh hook.
  useEffect(() => {
    const timer = setInterval(() => setSeconds(compute()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the deadline changes
  }, [until?.getTime()]);
  return seconds;
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 font-mono font-semibold hover:text-primary"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {value}
      <Copy className="h-3.5 w-3.5" aria-hidden />
      <span className="text-xs font-normal text-emerald-600">{copied ? "Đã chép" : ""}</span>
    </button>
  );
}
