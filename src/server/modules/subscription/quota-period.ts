// Quota periods follow Vietnam time (UTC+7, no daylight saving), so a month
// or a day resets at local midnight for the people paying in VND.
import type { QuotaPeriod } from "@/shared/plan/plans";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** "M:2026-11" for a month, "D:2026-11-24" for a day. */
export function periodKey(period: QuotaPeriod, now: Date): string {
  const local = new Date(now.getTime() + VN_OFFSET_MS);
  const month = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}`;
  return period === "month" ? `M:${month}` : `D:${month}-${pad(local.getUTCDate())}`;
}

/** The instant the period containing `now` ends and the next one starts. */
export function periodResetsAt(period: QuotaPeriod, now: Date): Date {
  const local = new Date(now.getTime() + VN_OFFSET_MS);
  const nextLocalMidnight =
    period === "month"
      ? Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1)
      : Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return new Date(nextLocalMidnight - VN_OFFSET_MS);
}
