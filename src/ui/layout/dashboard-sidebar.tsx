"use client";

import { useState, useCallback } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  BookOpen,
  BookMarked,
  GraduationCap,
  Library,
  Menu,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/contracts/utils";
import { Button } from "@/ui/primitives/button";
import { AuthControls } from "./auth-controls";
import { SettingsModal } from "@/features/study/ui/settings-modal";
import { useTranslations } from "next-intl";
import { useStudySessionHeartbeat } from "@/features/study/hooks/use-study-session-heartbeat";
import { useTheme } from "@/ui/theme-provider";
import { useSyncExternalStore } from "react";

// App shell per design.md §8:
// - 62px dark rail (#221F2B), 40px icon tiles (radius 13px)
// - Active item bg rgba(255,255,255,.14), indigo gradient logo top
// - Side panels warm paper (#FBF9F5), 54px header with UPPERCASE label
// - Reader region pure white; app frame 100vh / overflow:hidden

const RAIL_WIDTH_PX = 62;

const navItems = [
  { href: "/", labelKey: "Navigation.dashboard", icon: GraduationCap },
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      <aside
        style={{ width: RAIL_WIDTH_PX }}
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-rail items-center py-5 z-40"
      >
        <SidebarContent
          isActive={isActive}
          t={t}
          onOpenSettings={() => setSettingsOpen(true)}
        />
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
          onOpenSettings={() => {
            setMobileOpen(false);
            setSettingsOpen(true);
          }}
          t={t}
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
          <span className="font-semibold text-foreground text-sm">English Reading</span>
          <div className="ml-auto">
            <AuthControls compact />
          </div>
        </header>
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}


function RailThemeButton({ isActive }: { isActive: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) {
    return (
      <div className="w-10 h-10 flex items-center justify-center text-white/30">
        <Sun className="w-5 h-5" />
      </div>
    );
  }
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={theme === "light" ? "Switch to dark" : "Switch to light"}
      className={cn(
        "w-10 h-10 flex items-center justify-center rounded-[13px] transition-all",
        isActive
          ? "bg-white/[0.14] text-white"
          : "text-white/60 hover:text-white hover:bg-white/[0.08]",
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function SidebarContent({
  isActive,
  t,
  onOpenSettings,
}: {
  isActive: (href: string) => boolean;
  t: ReturnType<typeof useTranslations>;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex flex-col h-full w-full items-center">
      <div
        className="mb-6 w-10 h-10 rounded-[13px] flex items-center justify-center text-white"
        style={{
          background:
            "linear-gradient(135deg, #5A4FE0 0%, #7A6BFF 60%, #F2664A 100%)",
        }}
        aria-hidden
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
              aria-label={t(item.labelKey)}
              title={t(item.labelKey)}
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

      <div className="mt-4 pt-4 w-full px-2 border-t border-white/10 flex flex-col items-center gap-1.5">
        <RailThemeButton isActive={false} />
        <button
          type="button"
          onClick={onOpenSettings}
          title={t("Navigation.settings")}
          aria-label={t("Navigation.settings")}
          className="w-10 h-10 flex items-center justify-center rounded-[13px] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
        <div className="mt-1">
          <AuthControls />
        </div>
      </div>
    </div>
  );
}

function MobileSidebarContent({
  isActive,
  onNavigate,
  onOpenSettings,
  t,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  onOpenSettings: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white"
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

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
        >
          <SettingsIcon className="w-4.5 h-4.5 text-muted-foreground" />
          {t("Navigation.settings")}
        </button>
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <AuthControls compact />
      </div>
    </div>
  );
}
