import { useState } from "react";
import { Separator } from "@/client/components/ui/separator";
import { getErrorMessage } from "@/client/lib/api/error-message";
import type { Checkout } from "@/shared/plan/plans";
import { useCheckoutMutation, useRefreshSubscription } from "../api/queries";
import { CheckoutDialog } from "./checkout-dialog";
import { PaymentHistory } from "./payment-history";
import { PricingPlans } from "./pricing-plans";
import { SubscriptionOverview } from "./subscription-overview";

export function BillingPage() {
  const checkout = useCheckoutMutation();
  const refresh = useRefreshSubscription();
  const [open, setOpen] = useState<Checkout | null>(null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gói đăng ký</h1>
        <p className="mt-1 text-sm text-muted-foreground">Trạng thái gói, hạn dùng, lượt sử dụng và nâng cấp Pro</p>
      </div>
      <Separator />
      <SubscriptionOverview />
      <PricingPlans busy={checkout.isPending} onChoose={(plan) => checkout.mutate(plan, { onSuccess: setOpen })} />
      {checkout.error && <p className="text-sm text-destructive">{getErrorMessage(checkout.error)}</p>}
      <PaymentHistory />
      <CheckoutDialog
        key={open?.order.id}
        checkout={open}
        onClose={() => {
          setOpen(null);
          void refresh();
        }}
      />
    </div>
    </div>
  );
}
