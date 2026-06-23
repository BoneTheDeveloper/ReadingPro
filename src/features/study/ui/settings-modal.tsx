"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Check, X, Globe, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/ui/primitives/button";
import { cn } from "@/contracts/utils";
import { useTheme } from "@/ui/theme-provider";
import { getCEFRBadgeVariant } from "@/contracts/ui/cefr-style";
import { getCEFRLabel } from "@/contracts/domain/cefr";
import { Badge } from "@/ui/primitives/badge";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const localeLabels: Record<string, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

const localeChip: Record<string, string> = {
  en: "EN",
  vi: "VI",
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

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

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
      <div className="relative w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-surface border border-border rounded-[22px] shadow-popup">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface px-7 pt-5 pb-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <div className="text-[19px] font-extrabold tracking-[-0.01em] text-foreground">
              {t("title")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{t("subtitle")}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={tc("close")}
            className="h-[34px] w-[34px] rounded-[11px] border border-border bg-surface text-muted-foreground hover:border-coral hover:text-coral transition-all"
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
                <LocaleDropdown
                  current={locale}
                  onChange={switchLocale}
                />
              }
            />
            <SettingsDivider />
            <SettingsRow
              label={t("translationLanguage")}
              hint={t("translationLanguageHint")}
              control={<Pill value="vi" options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]} />}
            />
          </SettingsSection>

          <SettingsSection title={t("level")}>
            <div className="border border-border rounded-[14px] bg-surface p-4">
              <div className="text-[13px] font-semibold text-foreground">{t("targetLevel")}</div>
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
                    onClick={() => {/* hook to user preferences in future */}}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={getCEFRBadgeVariant("B2")}>{getCEFRLabel("B2")}</Badge>
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
            <SettingsDivider />
            <SettingsRow
              label={t("autoPlay")}
              hint={t("autoPlayHint")}
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
                    { value: "light", label: t("themeLight"), icon: <Sparkles className="w-3 h-3" /> },
                    { value: "dark", label: t("themeDark"), icon: <BookOpen className="w-3 h-3" /> },
                    { value: "system", label: t("themeSystem"), icon: <Globe className="w-3 h-3" /> },
                  ]}
                  onChange={(v) => setTheme(v as "light" | "dark" | "system")}
                />
              }
            />
            <SettingsDivider />
            <SettingsRow
              label={t("readingSize")}
              hint={t("readingSizeHint")}
              control={
                <Pill
                  value="m"
                  options={[
                    { value: "s", label: "A−" },
                    { value: "m", label: "A" },
                    { value: "l", label: "A+" },
                  ]}
                />
              }
            />
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-surface px-7 py-4 border-t border-border flex items-center justify-between gap-4">
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

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground mb-2.5">
        {title}
      </div>
      <div className="border border-border rounded-[14px] overflow-hidden bg-surface">{children}</div>
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
  return <div className="h-px bg-border" />;
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
    <div className="inline-flex bg-paper border border-border rounded-[11px] p-[3px]" role="tablist">
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
              "inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-[12.5px] transition-all",
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

function LocaleDropdown({
  current,
  onChange,
}: {
  current: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-[11px] bg-surface text-[13px] font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
      >
        <span className="w-6 h-[18px] rounded-[5px] bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {localeChip[current] ?? current.toUpperCase()}
        </span>
        {localeLabels[current] ?? current}
        <span className="text-muted-foreground">▾</span>
      </button>
      <div className="absolute right-0 top-full mt-2 w-[212px] bg-surface border border-border rounded-[14px] shadow-popup p-1.5 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        {routing.locales.map((loc) => {
          const active = loc === current;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => onChange(loc)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left transition-colors",
                active ? "bg-primary/10" : "hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "w-[30px] h-[30px] rounded-[9px] text-[11px] font-bold flex items-center justify-center",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-ink-2",
                )}
              >
                {localeChip[loc] ?? loc.toUpperCase()}
              </span>
              <div className="flex-1">
                <div className={cn("text-[13px] font-semibold", active ? "text-primary" : "text-foreground")}>
                  {localeLabels[loc] ?? loc}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {loc === "vi" ? "Vietnamese" : "English"}
                </div>
              </div>
              {active && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
