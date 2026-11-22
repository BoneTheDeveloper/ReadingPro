// The one place that decides what counts as Pro. It reads the session's
// `"User"."tier"` for now; the billing work swaps the source, not the callers.

const PRO_TIER = "PRO";

export function isProTier(tier: string | null | undefined): boolean {
  return tier === PRO_TIER;
}
