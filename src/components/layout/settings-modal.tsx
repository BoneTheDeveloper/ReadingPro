"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Check, X, Globe, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/provider/theme-provider";
import { getCEFRBadgeVariant } from "@/features/study/ui/cefr-style";
import { getCEFRLabel } from "@/contracts/domain/cefr";
import { Badge } from "@/components/ui/badge";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const localeLabels: Record<string, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Close any open dropdown when clicking outside
  useEffect(() => {
    if (!activeDropdown) return;
    function handler() {
      setActiveDropdown(null);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [activeDropdown]);

  if (!open) return null;

  const switchLocale = (next: string) => {
    router.replace(pathname, { locale: next });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-rail/40 backdrop-blur-[3px]"
        aria-hidden
      />
      <div className="relative w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-surface border border-border shadow-popup">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface px-7 pt-5 pb-4 border-b border-border/20 flex items-start justify-between gap-4">
          <div>
            <div className="text-[19px] font-extrabold tracking-[-0.01em] text-foreground">
              {t("title")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("subtitle")}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={tc("close")}
            className="h-[34px] w-[34px] border border-border bg-surface text-muted-foreground hover:border-coral hover:text-coral transition-all"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </Button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-6">
          <SettingsSection title={t("language")}>
            <SettingsRow
              label={t("uiLanguage")}
              hint={t("uiLanguageHint")}
              control={
                <LocalePill
                  id="ui-lang"
                  activeDropdown={activeDropdown}
                  onToggle={(id) =>
                    setActiveDropdown(activeDropdown === id ? null : id)
                  }
                  value={locale}
                  options={routing.locales.map((loc) => ({
                    value: loc,
                    label: localeLabels[loc] ?? loc,
                  }))}
                  onChange={(v) => switchLocale(v)}
                />
              }
            />
            <SettingsDivider />
          </SettingsSection>

          <SettingsSection title={t("pronunciation")}>
            <SettingsRow
              label={t("voice")}
              hint={t("voiceHint")}
              control={
                <Pill
                  value="us"
                  options={[
                    { value: "us", label: t("voiceUS") },
                    { value: "uk", label: t("voiceUK") },
                  ]}
                />
              }
            />
          </SettingsSection>

          <SettingsSection title={t("level")}>
            <div className="border border-border bg-surface p-4">
              <div className="text-[13px] font-semibold text-foreground">
                {t("targetLevel")}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 mb-3">
                {t("targetLevelHint")}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {CEFR_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={cn(
                      "rounded-[10px] py-2 text-[12.5px] font-semibold transition-all",
                      level === "B2"
                        ? "bg-primary text-primary-foreground shadow-indigo"
                        : "bg-muted text-ink-2 hover:bg-muted/70",
                    )}
                    onClick={() => {
                      /* hook to user preferences in future */
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={getCEFRBadgeVariant("B2")}>
                  {getCEFRLabel("B2")}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {t("currentLevelHint")}
                </span>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title={t("goals")}>
            <SettingsRow
              label={t("dailyGoal")}
              hint={t("dailyGoalHint")}
              control={
                <Pill
                  value="20"
                  options={[
                    { value: "10", label: t("minutes10") },
                    { value: "20", label: t("minutes20") },
                    { value: "30", label: t("minutes30") },
                  ]}
                />
              }
            />
            <SettingsDivider />
            <SettingsRow
              label={t("reviewReminders")}
              hint={t("reviewRemindersHint")}
              control={<Switch defaultChecked />}
            />
          </SettingsSection>

          <SettingsSection title={t("display")}>
            <SettingsRow
              label={t("theme")}
              hint={t("themeHint")}
              control={
                <Pill
                  value={theme}
                  options={[
                    {
                      value: "light",
                      label: t("themeLight"),
                      icon: <Sparkles className="w-3 h-3" />,
                    },
                    {
                      value: "dark",
                      label: t("themeDark"),
                      icon: <BookOpen className="w-3 h-3" />,
                    },
                    {
                      value: "system",
                      label: t("themeSystem"),
                      icon: <Globe className="w-3 h-3" />,
                    },
                  ]}
                  onChange={(v) => setTheme(v as "light" | "dark" | "system")}
                />
              }
            />
            <SettingsDivider />
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-surface px-7 py-4 border-t border-border/20 flex items-center justify-between gap-4">
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <Check className="w-3 h-3 text-success" />
            {t("autoSaved")}
          </div>
          <Button onClick={onClose} className="shadow-indigo">
            {tc("done")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground mb-2.5">
        {title}
      </div>
      <div className="border border-border bg-surface">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function SettingsDivider() {
  return <div className="h-px bg-border/20" />;
}

function Pill<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange?: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex bg-paper border border-border p-[3px]"
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              "inline-flex items-center gap-1 px-3.5 py-1.5 text-[12.5px] transition-all",
              active
                ? "bg-surface text-primary font-semibold shadow-sm"
                : "text-muted-foreground font-medium hover:text-foreground",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Switch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  // Lightweight visual switch; no state mgmt needed for this initial cut.
  return (
    <div
      className={cn(
        "w-[42px] h-6 rounded-full p-0.5 transition-colors",
        defaultChecked ? "bg-primary" : "bg-border-strong",
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
          defaultChecked ? "translate-x-[18px]" : "translate-x-0",
        )}
      />
    </div>
  );
}

function LocalePill<T extends string>({
  id,
  activeDropdown,
  onToggle,
  value,
  options,
  onChange,
}: {
  id: string;
  activeDropdown: string | null;
  onToggle: (id: string) => void;
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange?: (v: T) => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const isOpen = activeDropdown === id;

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = ref.current!.getBoundingClientRect();
    setPos({ top: rect.bottom, left: rect.left, width: rect.width });
    onToggle(id);
  };

  if (!isOpen) {
    return (
      <div ref={ref}>
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-2 px-3 py-2 border border-border bg-surface text-[13px] font-semibold text-foreground hover:border-primary hover:text-primary transition-all min-w-[120px]"
        >
          {selected?.icon}
          <span className="flex-1 text-left">{selected?.label}</span>
          <span className="text-muted-foreground">▾</span>
        </button>
      </div>
    );
  }

  return createPortal(
    <div
      className="fixed z-[200] w-[160px] bg-surface border border-border shadow-popup p-1.5"
      style={{ top: pos.top + 8, left: pos.left + pos.width - 160 }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange?.(opt.value);
              onToggle(id);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
              active ? "bg-primary/10" : "hover:bg-muted",
            )}
          >
            {opt.icon && (
              <span className="text-muted-foreground">{opt.icon}</span>
            )}
            <span
              className={cn(
                "text-[13px] font-semibold flex-1",
                active ? "text-primary" : "text-foreground",
              )}
            >
              {opt.label}
            </span>
            {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
