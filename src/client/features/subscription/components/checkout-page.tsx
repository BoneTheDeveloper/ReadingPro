import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Copy, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { getErrorMessage } from "@/client/lib/api/error-message";
import type { Checkout } from "@/shared/plan/plans";
import { subscriptionQueries, useCheckoutMutation, useRefreshSubscription } from "../api/queries";
import { formatDate, formatDateTime, formatVnd, PLAN_LABELS } from "../lib/labels";

/**
 * Hosted-checkout style page for one order: the summary on the left, the
 * VietQR and transfer details on the right, and a live status that flips to a
 * receipt when SePay confirms. The URL holds the order, so a reload keeps it.
 */
export function CheckoutPage({ orderId }: { orderId: string }) {
  const { data, error } = useQuery(subscriptionQueries.checkout(orderId));
  const refresh = useRefreshSubscription();
  const status = data?.order.status;

  useEffect(() => {
    if (status === "PAID") void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once when the order turns paid
  }, [status]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/pricing" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Quay lại
          </Link>
          <span className="flex items-center gap-2 text-sm font-bold">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden />
            ReadingPro
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error ? (
          <p className="text-center text-destructive">{getErrorMessage(error)}</p>
        ) : !data ? (
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Đang tải đơn hàng…
          </p>
        ) : (
          <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
            <OrderSummary checkout={data} />
            {data.order.status === "PAID" ? <PaidPanel checkout={data} /> : <PayPanel checkout={data} />}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderSummary({ checkout: { order } }: { checkout: Checkout }) {
  return (
    <section aria-label="Tóm tắt đơn hàng" className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Đăng ký</p>
        <h1 className="mt-1 text-2xl font-bold">ReadingPro {PLAN_LABELS[order.planCode].name}</h1>
        <p className="mt-2 text-4xl font-bold tabular-nums">{formatVnd(order.amount)}</p>
      </div>
      <dl className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
        <Row label="Gói">{PLAN_LABELS[order.planCode].name}</Row>
        <Row label="Thời hạn">{order.months} tháng, cộng nối tiếp nếu còn hạn</Row>
        <Row label="Mã đơn">
          <span className="font-mono">{order.paymentCode}</span>
        </Row>
        <Row label="Ngày tạo">{formatDateTime(order.createdAt)}</Row>
        <Row label="Trạng thái">
          <StatusPill status={order.status} />
        </Row>
        <Row label="Tổng thanh toán">
          <span className="font-bold">{formatVnd(order.amount)}</span>
        </Row>
      </dl>
    </section>
  );
}

function PayPanel({ checkout }: { checkout: Checkout }) {
  const { order, bank, qrUrl } = checkout;
  const secondsLeft = useSecondsLeft(order.expiresAt);
  const expired = order.status === "EXPIRED" || secondsLeft === 0;

  return (
    <section aria-label="Thanh toán" className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold">Quét mã để thanh toán</h2>
      <p className="mt-1 text-sm text-muted-foreground">Dùng app ngân hàng bất kỳ hỗ trợ VietQR.</p>

      <div className="mt-5 flex justify-center">
        {expired ? <ExpiredQr planCode={order.planCode} /> : (
          <img src={qrUrl} alt={`Mã VietQR thanh toán ${formatVnd(order.amount)}`} width={240} height={240} className="aspect-square w-60 rounded-xl border border-border bg-white p-2" />
        )}
      </div>

      {!expired && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Đang chờ thanh toán
          <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        </p>
      )}

      <dl className="mt-6 divide-y divide-border rounded-xl bg-muted/50 text-sm">
        <Row label="Ngân hàng">{bank.code}</Row>
        <Row label="Số tài khoản"><CopyValue value={bank.accountNumber} /></Row>
        <Row label="Chủ tài khoản">{bank.accountName}</Row>
        <Row label="Số tiền"><CopyValue value={String(order.amount)} display={formatVnd(order.amount)} /></Row>
        <Row label="Nội dung"><CopyValue value={order.paymentCode} /></Row>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Chuyển khoản thủ công thì giữ đúng nội dung để đơn được xác nhận tự động.</p>
    </section>
  );
}

function ExpiredQr({ planCode }: { planCode: Checkout["order"]["planCode"] }) {
  const navigate = useNavigate();
  const checkout = useCheckoutMutation();
  return (
    <div className="flex aspect-square w-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-4 text-center">
      <p className="text-sm font-medium">Mã QR đã hết hạn</p>
      <p className="text-xs text-muted-foreground">Đã chuyển khoản đúng nội dung? Đơn vẫn được xác nhận khi tiền về.</p>
      <Button
        size="sm"
        disabled={checkout.isPending}
        onClick={() => checkout.mutate(planCode, { onSuccess: (c) => navigate(`/checkout/${c.order.id}`, { replace: true }) })}
      >
        Tạo mã mới
      </Button>
    </div>
  );
}

function PaidPanel({ checkout: { order } }: { checkout: Checkout }) {
  const status = useQuery(subscriptionQueries.status()).data;
  return (
    <section aria-label="Thanh toán thành công" className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
      <CheckCircle2 className="h-14 w-14 text-success" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold">Thanh toán thành công</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Đã nhận {formatVnd(order.amount)} lúc {formatDateTime(order.paidAt ?? order.createdAt)}.
        {status?.currentPeriodEnd && <> Pro có hiệu lực đến {formatDate(status.currentPeriodEnd)}.</>}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild><Link to="/study">Bắt đầu học</Link></Button>
        <Button asChild variant="secondary"><Link to="/account/billing">Xem gói của tôi</Link></Button>
      </div>
    </section>
  );
}

const STATUS_PILL = {
  PENDING: { label: "Chờ thanh toán", className: "bg-amber-soft text-amber-text" },
  PAID: { label: "Đã thanh toán", className: "bg-success-soft text-success" },
  EXPIRED: { label: "Mã QR hết hạn", className: "bg-muted text-muted-foreground" },
} as const;

function StatusPill({ status }: { status: Checkout["order"]["status"] }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_PILL[status].className)}>{STATUS_PILL[status].label}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function useSecondsLeft(until: Date): number {
  const compute = () => Math.max(0, Math.round((until.getTime() - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(compute);
  // The page remounts per order (keyed by id), so one timer per deadline.
  useEffect(() => {
    const timer = setInterval(() => setSeconds(compute()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the deadline changes
  }, [until.getTime()]);
  return seconds;
}

function CopyValue({ value, display }: { value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Sao chép ${display ?? value}`}
      className="inline-flex min-h-8 items-center gap-1.5 font-mono font-semibold hover:text-primary"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {display ?? value}
      {copied ? <span className="font-sans text-xs font-normal text-success">Đã chép</span> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}

