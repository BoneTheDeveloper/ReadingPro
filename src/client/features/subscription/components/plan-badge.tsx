import { Link } from "react-router";
import { Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/client/lib/utils";
import { subscriptionQueries } from "../api/queries";

/** The tier in the top bar: Free, Pro, or Pro with a days-left warning. Links to the plans page. */
export function PlanBadge({ className }: { className?: string }) {
  const { data } = useQuery(subscriptionQueries.status());
  if (!data) return null;

  const pro = data.tier === "PRO";
  const label = !pro
    ? data.state === "expired" ? "Pro đã hết hạn" : "Free"
    : data.state === "expiring" ? `Pro · còn ${data.daysLeft} ngày` : "Pro";

  return (
    <Link
      to={pro ? "/account/billing" : "/pricing"}
      title={pro ? "Gói & thanh toán" : "Nâng cấp lên Pro"}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        pro && data.state !== "expiring" && "bg-amber-400/20 text-amber-200 hover:bg-amber-400/30",
        data.state === "expiring" && "bg-orange-500/25 text-orange-200 hover:bg-orange-500/35",
        !pro && "bg-white/10 text-white hover:bg-white/20",
        className,
      )}
    >
      {pro && <Crown className="h-3.5 w-3.5" />}
      {label}
      {!pro && <span className="text-amber-200">· Nâng cấp</span>}
    </Link>
  );
}
