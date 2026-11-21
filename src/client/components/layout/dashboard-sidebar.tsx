"use client";

import { useCallback } from "react";
import { Link, useLocation } from "react-router";
import { BookOpen, GraduationCap, Library } from "lucide-react";
import { cn } from "@/client/lib/utils";
import { TooltipProvider } from "@/client/components/ui/tooltip";
import { AuthControls } from "@/client/features/auth";

const navItems = [
  { href: "/study", label: "Học tập", icon: BookOpen },
  { href: "/vocabulary", label: "Từ vựng", icon: Library },
];

interface DashboardSidebarProps {
  children: React.ReactNode;
}

/**
 * App shell. App-level navigation lives in a horizontal top bar so pages keep
 * their full width for their own side panels (the study workspace has a
 * sources column on the left).
 * - md and up: top bar with nav tabs and the account menu.
 * - below md: top bar shows the brand only; nav moves to a bottom tab bar.
 * The page is rendered exactly once; only the navigation chrome changes.
 */
export function DashboardSidebar({ children }: DashboardSidebarProps) {
  const { pathname } = useLocation();

  const isActive = useCallback(
    (href: string) => {
      if (href === "/study") {
        return (
          pathname === "/study" ||
          pathname === "/upload" ||
          pathname.startsWith("/reading/")
        );
      }
      if (href === "/vocabulary") {
        return pathname === "/vocabulary" || pathname.startsWith("/review");
      }
      return pathname.startsWith(href);
    },
    [pathname],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-dvh flex flex-col bg-background overflow-hidden">
        <TopBar isActive={isActive} />

        <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {children}
        </main>

        <BottomTabBar
          isActive={isActive}
          accountActive={pathname.startsWith("/account")}
        />
      </div>
    </TooltipProvider>
  );
}

function TopBar({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <header className="shrink-0 h-12 md:h-13 flex items-center gap-6 bg-rail px-4 md:px-5 text-white z-40">
      <Link
        to="/study"
        className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
          <GraduationCap className="w-[18px] h-[18px]" />
        </span>
        <span className="font-bold text-sm tracking-tight">ReadingPro</span>
      </Link>

      <nav aria-label="Điều hướng chính" className="hidden md:flex self-stretch items-stretch gap-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2 px-3 text-sm font-medium transition-colors outline-none focus-visible:bg-white/[0.08]",
                active
                  ? "text-white"
                  : "text-sidebar-foreground hover:text-white",
              )}
            >
              <item.icon className="w-4 h-4" strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
              {active && (
                <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-sidebar-ring" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto hidden md:flex items-center">
        <AuthControls variant="rail" />
      </div>
    </header>
  );
}

function BottomTabBar({
  isActive,
  accountActive,
}: {
  isActive: (href: string) => boolean;
  accountActive: boolean;
}) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="md:hidden shrink-0 flex bg-rail border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]"
    >
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors outline-none focus-visible:bg-white/[0.08]",
              active ? "text-white" : "text-sidebar-foreground hover:text-white",
            )}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-sidebar-ring" />
            )}
            <item.icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
            {item.label}
          </Link>
        );
      })}
      <AuthControls variant="tab" active={accountActive} />
    </nav>
  );
}
