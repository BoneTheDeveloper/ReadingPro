// When a quota period starts and ends.
//
// Monthly quotas follow the billing cycle, as in Stripe-style subscriptions:
// each cycle starts on the anchor's day of the month (the Pro start date, or
// the sign-up date on Free) and an anchor on the 29th-31st falls back to the
// last day of a shorter month. Daily quotas reset at midnight Vietnam time
// (UTC+7, no daylight saving).
import type { QuotaPeriod } from "@/shared/plan/plans";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** `anchor` moved `months` calendar months on, clamped to that month's last day. */
export function addMonths(anchor: Date, months: number): Date {
  const shifted = new Date(anchor);
  shifted.setUTCDate(1);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
  shifted.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  return shifted;
}

/** The billing-cycle month containing `now`, counted from `anchor`. */
export function billingCycle(anchor: Date, now: Date): { start: Date; end: Date } {
  let months =
    (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (now.getUTCMonth() - anchor.getUTCMonth());
  if (addMonths(anchor, months) > now) months -= 1;
  months = Math.max(months, 0);
  return { start: addMonths(anchor, months), end: addMonths(anchor, months + 1) };
}

/**
 * The usage counter key and the reset time for `period` at `now`.
 * Monthly: "C:<cycle start ISO>", so a new anchor (buying Pro) starts a fresh
 * cycle. Daily: "D:2026-11-24" in Vietnam time.
 */
export function quotaWindow(period: QuotaPeriod, anchor: Date, now: Date): { key: string; resetsAt: Date } {
  if (period === "month") {
    const cycle = billingCycle(anchor, now);
    return { key: `C:${cycle.start.toISOString()}`, resetsAt: cycle.end };
  }
  const local = new Date(now.getTime() + VN_OFFSET_MS);
  const key = `D:${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const nextMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - VN_OFFSET_MS;
  return { key, resetsAt: new Date(nextMidnight) };
}
