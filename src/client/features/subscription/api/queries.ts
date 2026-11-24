import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/client/lib/api/fetch-json";
import {
  CheckoutSchema,
  PaymentOrderListSchema,
  SubscriptionStatusSchema,
  type ProPlanCode,
} from "@/shared/plan/plans";

export const subscriptionQueries = {
  all: () => ["subscription"] as const,

  /** Tier, period end and this period's usage. Refetched often: every AI action uses quota. */
  status: () =>
    queryOptions({
      queryKey: [...subscriptionQueries.all(), "status"] as const,
      staleTime: 30_000,
      queryFn: ({ signal }) => fetchJson("/api/subscription", SubscriptionStatusSchema, { signal }),
    }),

  orders: () =>
    queryOptions({
      queryKey: [...subscriptionQueries.all(), "orders"] as const,
      queryFn: ({ signal }) => fetchJson("/api/subscription/orders", PaymentOrderListSchema, { signal }),
    }),

  /** The checkout page's order and QR, polled until SePay's webhook marks it paid. */
  checkout: (id: string) =>
    queryOptions({
      queryKey: [...subscriptionQueries.all(), "checkout", id] as const,
      queryFn: ({ signal }) => fetchJson(`/api/subscription/orders/${id}`, CheckoutSchema, { signal }),
      refetchInterval: (query) => (query.state.data?.order.status === "PENDING" ? 3_000 : false),
      refetchIntervalInBackground: true,
    }),
};

export function useCheckoutMutation() {
  return useMutation({
    mutationKey: [...subscriptionQueries.all(), "checkout"] as const,
    mutationFn: (planCode: ProPlanCode) =>
      fetchJson("/api/subscription/checkout", CheckoutSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      }),
  });
}

/** True on Pro. False while loading, so Pro-only controls never flash for Free users. */
export function useIsPro(): boolean {
  return useQuery(subscriptionQueries.status()).data?.tier === "PRO";
}

/** Usage and the tier change after a metered action; call it from that action's onSuccess/onError. */
export function useRefreshSubscription() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: subscriptionQueries.all() });
}
