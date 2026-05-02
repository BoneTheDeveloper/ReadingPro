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
  LayoutDashboard,
  Settings,
  HelpCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";

const navItems = [
  {
    href: "/study",
    label: "Study",
    icon: BookOpen,
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
    <div className="min-h-[100dvh] flex bg-background">
      {/* Desktop icon sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-20 lg:fixed lg:inset-y-0 bg-surface-container-low border-r border-outline-variant/30 items-center py-8 z-40">
        <SidebarContent isActive={isActive} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/10 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-surface-container-lowest border-r border-outline-variant/30 transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <MobileSidebarContent isActive={isActive} onNavigate={closeMobile} />
      </aside>

      {/* Main content area */}
      <div className="flex-1 lg:ml-20 flex flex-col min-h-[100dvh]">
        {/* Top bar */}
        <TopBar onMenuToggle={() => setMobileOpen(true)} />

        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}

function TopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden lg:flex fixed top-0 right-0 w-[calc(100%-5rem)] h-16 z-30 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-input border-none rounded-full w-64 text-[14px] focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest outline-none transition-all"
              placeholder="Search..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-on-surface-variant hover:text-primary transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[14px] font-semibold text-on-surface leading-none">
                Placeholder
              </p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">
                Placeholder
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-[14px] font-bold">P</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <GraduationCap className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground text-[14px]">
          English Reading
        </span>
      </header>
    </>
  );
}

function SidebarContent({
  isActive,
}: {
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="flex flex-col h-full w-full items-center">
      {/* Logo icon */}
      <div className="mb-10 text-primary">
        <GraduationCap className="w-7 h-7" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full px-3 space-y-2 flex flex-col items-center">
        <Link
          href="/"
          className="w-full flex justify-center items-center p-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-accent/60 transition-colors duration-200"
          title="Dashboard"
        >
          <LayoutDashboard className="w-5 h-5" />
        </Link>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-full flex justify-center items-center p-3 rounded-lg transition-colors duration-200",
                active
                  ? "text-primary bg-accent/80 border-r-4 border-primary"
                  : "text-on-surface-variant hover:text-primary hover:bg-accent/60",
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* New reading button */}
      <div className="px-3 w-full">
        <Link
          href="/study"
          className="mt-6 w-full py-3 flex justify-center bg-primary text-on-primary rounded-xl shadow-sm hover:opacity-90 active:scale-[0.99] transition-all"
          title="New Reading"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 w-full px-3 border-t border-outline-variant/30 space-y-2 flex flex-col items-center">
        <button className="w-full flex justify-center p-2 rounded-lg text-on-surface-variant hover:bg-accent/60 transition-colors" title="Settings">
          <Settings className="w-5 h-5" />
        </button>
        <button className="w-full flex justify-center p-2 rounded-lg text-on-surface-variant hover:bg-accent/60 transition-colors" title="Help">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function MobileSidebarContent({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-outline-variant/30">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-on-primary" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-on-surface leading-tight">
              English Reading
            </h1>
            <p className="text-[11px] text-on-surface-variant leading-tight">
              Training App
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-on-surface-variant hover:bg-accent/60 hover:text-on-surface transition-colors"
        >
          <LayoutDashboard className="w-[18px] h-[18px]" />
          Dashboard
        </Link>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors",
                active
                  ? "bg-accent text-primary"
                  : "text-on-surface-variant hover:bg-accent/60 hover:text-on-surface",
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px]", active ? "text-primary" : "text-on-surface-variant")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
