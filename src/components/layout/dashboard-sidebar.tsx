"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookMarked,
  GraduationCap,
  Library,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthControls } from "./auth-controls";
import type { AuthSession } from "@/lib/auth/types";

type SessionUser = NonNullable<AuthSession>["user"];

const RAIL_WIDTH_PX = 62;

const navItems = [
  { href: "/study", label: "Học tập", icon: BookOpen },
  { href: "/vocabulary", label: "Từ vựng", icon: Library },
  { href: "/dictionary", label: "Từ điển", icon: BookMarked },
];

interface DashboardSidebarProps {
  children: React.ReactNode;
  user: SessionUser | null;
}

export function DashboardSidebar({ children, user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

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
        return pathname === "/vocabulary";
      }
      if (href === "/dictionary") {
        return pathname === "/dictionary";
      }
      return pathname.startsWith(href);
    },
    [pathname],
  );

  return (
    <div className="h-dvh flex bg-background overflow-hidden">
      <aside
        style={{ width: RAIL_WIDTH_PX }}
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-rail items-center py-5 z-40"
      >
        <SidebarContent isActive={isActive} user={user} />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/10 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-70 bg-background border-r border-border transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <MobileSidebarContent
          isActive={isActive}
          onNavigate={closeMobile}
          user={user}
        />
      </aside>

      <div
        style={{ marginLeft: RAIL_WIDTH_PX }}
        className="hidden lg:flex flex-1 flex-col h-dvh overflow-hidden"
      >
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>

      <div className="lg:hidden flex-1 flex flex-col h-dvh overflow-hidden">
        <header className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="-ml-1.5"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <GraduationCap className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            English Reading
          </span>
          <div className="ml-auto flex items-center gap-2">
            <AuthControls compact user={user} />
          </div>
        </header>
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  isActive,
  user,
}: {
  isActive: (href: string) => boolean;
  user: SessionUser | null;
}) {
  return (
    <div className="flex flex-col h-full w-full items-center">
      <div
        className="mb-6 w-10 h-10 rounded-[13px] flex justify-center items-center text-white cursor-default"
        style={{
          background:
            "linear-gradient(135deg, #5A4FE0 0%, #7A6BFF 60%, #F2664A 100%)",
        }}
      >
        <GraduationCap className="w-5 h-5" />
      </div>

      <nav className="flex-1 w-full px-2 space-y-1.5 flex flex-col items-center">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "w-10 h-10 flex justify-center items-center rounded-[13px] transition-all",
                active
                  ? "bg-white/[0.14] text-white"
                  : "text-white/60 hover:text-white hover:bg-white/[0.08]",
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={1.75} />
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 pt-4 w-full px-2 border-t border-white/10 flex flex-col items-center gap-3">
        <AuthControls user={user} />
      </div>
    </div>
  );
}

function MobileSidebarContent({
  isActive,
  onNavigate,
  user,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  user: SessionUser | null;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[12px] flex justify-center items-center text-white cursor-default"
            style={{
              background:
                "linear-gradient(135deg, #5A4FE0 0%, #7A6BFF 60%, #F2664A 100%)",
            }}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              English Reading
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Training App
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "w-4.5 h-4.5",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border flex items-center justify-between">
        <AuthControls compact user={user} />
      </div>
    </div>
  );
}