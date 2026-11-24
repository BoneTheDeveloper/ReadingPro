import { cn } from "@/client/lib/utils";
import type { Usage } from "@/shared/plan/plans";
import { FEATURE_LABELS, formatReset } from "../lib/labels";

/** One meter per metered feature: used / limit this period and when it resets. */
export function UsageMeters({ usage }: { usage: Usage[] }) {
  return (
    <ul className="divide-y divide-border">
      {usage.map((u) => {
        const locked = u.limit === 0;
        const ratio = locked ? 0 : Math.min(u.used / u.limit, 1);
        return (
          <li key={u.feature} className="space-y-2 py-4 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{FEATURE_LABELS[u.feature]}</span>
              <span className={cn("tabular-nums text-muted-foreground", ratio >= 1 && "font-semibold text-destructive")}>
                {locked ? "Chỉ có ở gói Pro" : `${u.used} / ${u.limit}`}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={FEATURE_LABELS[u.feature]}
              aria-valuemin={0}
              aria-valuemax={u.limit}
              aria-valuenow={u.used}
            >
              <div
                className={cn("h-full rounded-full transition-[width]", ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-orange-500" : "bg-primary")}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            {!locked && (
              <p className="text-xs text-muted-foreground">
                {u.period === "day" ? "Hạn mức ngày" : "Hạn mức tháng"} · {formatReset(u.resetsAt, u.period)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
