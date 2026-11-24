import { useState } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { FEATURE_PERIOD, METERED_FEATURES, PLAN_QUOTAS, PRO_PLANS, type PlanTier, type ProPlanCode } from "@/shared/plan/plans";
import { FEATURE_LABELS, formatVnd } from "../lib/labels";

type Cycle = "monthly" | "yearly";
const CYCLE_PLAN: Record<Cycle, ProPlanCode> = { monthly: "PRO_MONTHLY", yearly: "PRO_YEARLY" };

function benefits(tier: PlanTier): string[] {
  const included = METERED_FEATURES.filter((f) => PLAN_QUOTAS[tier][f] > 0).map(
    (f) => `${FEATURE_LABELS[f]}: ${PLAN_QUOTAS[tier][f]}/${FEATURE_PERIOD[f] === "day" ? "ngày" : "tháng"}`,
  );
  return ["Đọc, tra từ điển, lưu và ôn từ vựng không giới hạn", ...included];
}

type PlanCardsProps =
  /** Landing page: both CTAs lead to sign-up. */
  | { variant: "marketing" }
  /** In the app: Free is marked current, Pro opens the VietQR checkout. */
  | { variant: "app"; currentTier: PlanTier; busy: boolean; onUpgrade: (plan: ProPlanCode) => void };

/** Free and Pro side by side with a monthly/yearly switch, shared by the landing page and /pricing. */
export function PlanCards(props: PlanCardsProps) {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const pro = PRO_PLANS[CYCLE_PLAN[cycle]];
  const monthlyEquivalent = Math.round(pro.amount / pro.months / 1000) * 1000;

  return (
    <div className="space-y-8">
      <div role="radiogroup" aria-label="Chu kỳ thanh toán" className="mx-auto flex w-fit rounded-full border border-border bg-surface p-1">
        {(["monthly", "yearly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={cycle === value}
            onClick={() => setCycle(value)}
            className={cn(
              "min-h-10 rounded-full px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              cycle === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "monthly" ? "Theo tháng" : "Theo năm"}
            {value === "yearly" && <span className="ml-1.5 text-xs text-coral">-17%</span>}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <PlanCard
          name="Free"
          tagline="Làm quen với cách học đọc cùng AI"
          price="0đ"
          period="mãi mãi"
          items={benefits("FREE")}
          action={
            props.variant === "marketing" ? (
              <Button asChild variant="secondary" className="w-full"><Link to="/register">Bắt đầu miễn phí</Link></Button>
            ) : (
              <Button variant="secondary" className="w-full" disabled>
                {props.currentTier === "FREE" ? "Gói hiện tại của bạn" : "Gói cơ bản"}
              </Button>
            )
          }
        />
        <PlanCard
          highlighted
          name="Pro"
          tagline="Cho người học nghiêm túc mỗi ngày"
          price={formatVnd(pro.amount)}
          period={cycle === "monthly" ? "/tháng" : "/năm"}
          note={cycle === "yearly" ? `Tương đương ${formatVnd(monthlyEquivalent)}/tháng` : "Trả trước, không tự động gia hạn"}
          items={["Mọi quyền lợi của Free, với hạn mức cao hơn", ...benefits("PRO").slice(1)]}
          action={
            props.variant === "marketing" ? (
              <Button asChild variant="coral" className="w-full"><Link to="/register">Dùng thử rồi nâng cấp</Link></Button>
            ) : (
              <Button variant="coral" className="w-full" disabled={props.busy} onClick={() => props.onUpgrade(CYCLE_PLAN[cycle])}>
                {props.currentTier === "PRO" ? "Gia hạn Pro" : "Nâng cấp lên Pro"}
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}

function PlanCard(props: {
  name: string;
  tagline: string;
  price: string;
  period: string;
  note?: string;
  items: string[];
  action: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[24px] border bg-surface p-8 text-left",
        props.highlighted ? "border-primary shadow-lg ring-1 ring-primary" : "border-border",
      )}
    >
      {props.highlighted && (
        <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          Phổ biến
        </span>
      )}
      <h3 className="text-xl font-bold">{props.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{props.tagline}</p>
      <p className="mt-6">
        <span className="text-4xl font-bold tabular-nums">{props.price}</span>
        <span className="ml-1 text-muted-foreground">{props.period}</span>
      </p>
      <p className="mt-1 h-5 text-xs text-muted-foreground">{props.note}</p>
      <div className="mt-6">{props.action}</div>
      <ul className="mt-8 space-y-3 text-sm">
        {props.items.map((item) => (
          <li key={item} className="flex gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
