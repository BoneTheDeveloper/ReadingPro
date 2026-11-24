import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/client/lib/api/error-message";
import { subscriptionQueries, useCheckoutMutation } from "../api/queries";
import { PlanCards } from "./plan-cards";

/** The in-app upgrade page: plan cards; choosing Pro opens the checkout page for a new order. */
export function PricingPage() {
  const status = useQuery(subscriptionQueries.status());
  const checkout = useCheckoutMutation();
  const navigate = useNavigate();

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
          onUpgrade={(plan) => checkout.mutate(plan, { onSuccess: (c) => navigate(`/checkout/${c.order.id}`) })}
        />
        {checkout.error && <p className="text-center text-sm text-destructive">{getErrorMessage(checkout.error)}</p>}
      </div>
    </div>
  );
}
