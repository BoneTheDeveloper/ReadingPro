"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  Upload,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";

const navItems = [
  {
    href: "/study",
    label: "Study",
    icon: Upload,
  },
  {
    href: "/progress",
    label: "Progress",
    icon: BarChart3,
  },
];

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/study") {
        return (
          pathname === "/study" ||
          pathname === "/upload" ||
          pathname.startsWith("/reading/") ||
          pathname.startsWith("/test/")
        );
      }
      return pathname.startsWith(href);
    },
    [pathname],
  );

  return (
    <div className="min-h-[100dvh] flex bg-neutral-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-neutral-200 bg-white">
        <SidebarContent isActive={isActive} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent isActive={isActive} onNavigate={closeMobile} />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-[100dvh]">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
          <GraduationCap className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-neutral-900 text-sm">
            English Reading
          </span>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo / App name */}
      <div className="px-5 py-5 border-b border-neutral-100">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={onNavigate}
        >
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-900 leading-tight">
              English Reading
            </h1>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Training App
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
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
                  ? "bg-primary-50 text-primary-700"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
              )}
            >
              <item.icon
                className={cn(
                  "w-[18px] h-[18px]",
                  active ? "text-primary-600" : "text-neutral-400",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-neutral-100">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          onClick={onNavigate}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
