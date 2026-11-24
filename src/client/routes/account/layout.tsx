import { NavLink, Outlet } from "react-router";
import { CreditCard, Gauge, UserRound } from "lucide-react";
import { cn } from "@/client/lib/utils";

export { DashboardError as ErrorBoundary } from "@/client/components/layout/dashboard-error";

const tabs = [
  { to: "/account", label: "Chung", icon: UserRound, end: true },
  { to: "/account/billing", label: "Gói & thanh toán", icon: CreditCard, end: false },
  { to: "/account/usage", label: "Mức sử dụng", icon: Gauge, end: false },
];

/** Settings shell: a section list on the left (tabs on mobile) and the section on the right. */
export default function AccountLayout() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Cài đặt</h1>
        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          <nav aria-label="Mục cài đặt" className="flex gap-1 overflow-x-auto md:w-52 md:shrink-0 md:flex-col">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )
                }
              >
                <tab.icon className="h-4 w-4" aria-hidden />
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="min-w-0 max-w-2xl flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
