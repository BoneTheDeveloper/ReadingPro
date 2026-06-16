"use client";

import { useState, useCallback } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  BookOpen,
  BookMarked,
  GraduationCap,
  LayoutDashboard,
  Library,
  Menu,
  Plus,
  Search,
  Settings,
  HelpCircle,
  Bell,
} from "lucide-react";
import { cn } from "@/shared/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthControls } from "./auth-controls";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslations } from "next-intl";
import { useStudySessionHeartbeat } from "@/features/study/hooks/use-study-session-heartbeat";

const navItems = [
  { href: "/", labelKey: "Navigation.dashboard", icon: LayoutDashboard },
  { href: "/study", labelKey: "Navigation.study", icon: BookOpen },
  { href: "/vocabulary", labelKey: "Navigation.vocabulary", icon: Library },
  { href: "/dictionary", labelKey: "Navigation.dictionary", icon: BookMarked },
];

export function DashboardSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Canonical app-wide presence heartbeat: the sidebar wraps every authenticated
  // surface (landing dashboard + (dashboard) layout), so study time is tracked on
  // every page after login, not just the reading workspace.
  useStudySessionHeartbeat(true);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") {
        return pathname === "/" || pathname === "/progress";
      }
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
      <aside className="hidden lg:flex lg:flex-col lg:w-20 lg:fixed lg:inset-y-0 bg-muted border-r border-border items-center py-8 z-40">
        <SidebarContent isActive={isActive} t={t} />
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
        <MobileSidebarContent isActive={isActive} onNavigate={closeMobile} t={t} />
      </aside>

      <div className="flex-1 lg:ml-20 flex flex-col h-dvh overflow-hidden">
        <TopBar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function TopBar({
  onMenuToggle,
}: {
  onMenuToggle: () => void;
}) {
  return (
    <>
      <header className="hidden lg:flex fixed top-0 left-20 right-0 h-16 z-30 bg-background/80 backdrop-blur-md border-b border-border items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64 rounded-full bg-input border-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
          >
            <Bell className="w-5 h-5" />
          </Button>
          <AuthControls />
        </div>
      </header>

      <header className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="-ml-1.5"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <GraduationCap className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground text-sm">
          English Reading
        </span>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}

function SidebarContent({ isActive, t }: { isActive: (href: string) => boolean; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col h-full w-full items-center">
      <div className="mb-10 text-primary">
        <GraduationCap className="w-7 h-7" />
      </div>

      <nav className="flex-1 w-full px-3 space-y-2 flex flex-col items-center">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-full flex justify-center items-center p-3 rounded-lg transition-colors",
                active
                  ? "text-primary bg-accent/80 border-r-4 border-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-accent/60",
              )}
              title={t(item.labelKey)}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      <div className="px-3 w-full">
        <Link
          href="/study"
          className="mt-6 w-full py-3 flex justify-center bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 active:scale-[0.99] transition-all"
          title="New Reading"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      <div className="mt-auto pt-6 w-full px-3 border-t border-border space-y-2 flex flex-col items-center">
        <Button
          variant="ghost"
          size="icon"
          className="w-full text-muted-foreground hover:bg-accent/60"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-full text-muted-foreground hover:bg-accent/60"
          title="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
        <AuthControls compact />
      </div>
    </div>
  );
}

function MobileSidebarContent({
  isActive,
  onNavigate,
  t,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              English Reading
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Training App
            </p>
          </div>
        </Link>
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
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <AuthControls compact />
      </div>
    </div>
  );
}
