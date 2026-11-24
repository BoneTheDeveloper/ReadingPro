import { Check, Minus } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { FEATURE_PERIOD, METERED_FEATURES, PLAN_QUOTAS, PRO_PLANS, type ProPlanCode } from "@/shared/plan/plans";
import { FEATURE_LABELS, formatVnd, PLAN_LABELS } from "../lib/labels";

function quotaText(limit: number, period: "month" | "day") {
  if (limit === 0) return null;
  return `${limit} / ${period === "day" ? "ngày" : "tháng"}`;
}

/** Free vs Pro benefits side by side, and the two Pro purchase options. */
export function PricingPlans({ onChoose, busy }: { onChoose: (plan: ProPlanCode) => void; busy: boolean }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>So sánh quyền lợi</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Tính năng</th>
                <th className="py-2 font-medium">Free</th>
                <th className="py-2 font-medium text-primary">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Đọc, tra từ điển, lưu và ôn từ vựng</td>
                <td className="py-2"><Check className="h-4 w-4 text-emerald-600" aria-label="Có" /></td>
                <td className="py-2"><Check className="h-4 w-4 text-emerald-600" aria-label="Có" /></td>
              </tr>
              {METERED_FEATURES.map((feature) => (
                <tr key={feature} className="border-b last:border-0">
                  <td className="py-2">{FEATURE_LABELS[feature]}</td>
                  {(["FREE", "PRO"] as const).map((tier) => {
                    const text = quotaText(PLAN_QUOTAS[tier][feature], FEATURE_PERIOD[feature]);
                    return (
                      <td key={tier} className="py-2 tabular-nums">
                        {text ?? <Minus className="h-4 w-4 text-muted-foreground" aria-label="Không có" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(PRO_PLANS) as ProPlanCode[]).map((code) => {
          const plan = PRO_PLANS[code];
          const label = PLAN_LABELS[code];
          return (
            <Card key={code} className={code === "PRO_YEARLY" ? "border-primary" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {label.name}
                  {label.note && <span className="text-xs font-semibold text-coral">{label.note}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  <span className="text-3xl font-bold tabular-nums">{formatVnd(plan.amount)}</span>
                  <span className="text-muted-foreground">{label.cycle}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Trả trước một lần qua VietQR. Không tự động gia hạn; thanh toán khi còn hạn sẽ cộng nối tiếp thời gian.
                </p>
                <Button className="w-full" variant={code === "PRO_YEARLY" ? "coral" : "default"} disabled={busy} onClick={() => onChoose(code)}>
                  Thanh toán bằng VietQR
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
