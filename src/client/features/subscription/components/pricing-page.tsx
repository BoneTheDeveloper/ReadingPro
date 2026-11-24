import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/client/lib/api/error-message";
import type { Checkout } from "@/shared/plan/plans";
import { subscriptionQueries, useCheckoutMutation, useRefreshSubscription } from "../api/queries";
import { CheckoutDialog } from "./checkout-dialog";
import { PlanCards } from "./plan-cards";

/** The in-app upgrade page: plan cards, then the VietQR checkout for the chosen cycle. */
export function PricingPage() {
  const status = useQuery(subscriptionQueries.status());
  const checkout = useCheckoutMutation();
  const refresh = useRefreshSubscription();
  const [open, setOpen] = useState<Checkout | null>(null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Nâng cấp gói của bạn</h1>
          <p className="mt-2 text-muted-foreground">Học nhiều hơn mỗi ngày với hạn mức AI cao hơn.</p>
        </div>
        <PlanCards
          variant="app"
          currentTier={status.data?.tier ?? "FREE"}
          busy={checkout.isPending}
          onUpgrade={(plan) => checkout.mutate(plan, { onSuccess: setOpen })}
        />
        {checkout.error && <p className="text-center text-sm text-destructive">{getErrorMessage(checkout.error)}</p>}
      </div>
      <CheckoutDialog
        key={open?.order.id}
        checkout={open}
        onClose={() => {
          setOpen(null);
          void refresh();
        }}
      />
    </div>
  );
}
