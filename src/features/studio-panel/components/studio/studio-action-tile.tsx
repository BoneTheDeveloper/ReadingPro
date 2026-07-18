"use client";

import { useTranslations } from "next-intl";
import {
  Layers,
  BookOpen,
  HelpCircle,
  MessageCircle,
  Network,
  Languages,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioActionId } from "@/features/studio-panel/server/actions/artifact";

// All 6 wireframe tiles. Only quiz / chat / lookup are wired in this build;
// the rest stay visible but disabled per scope decision. Translate and lookup
// share a tile — both are lookup-via-translation flows.
type TileSpec = {
  id: StudioActionId;
  labelKey: string;
  descriptionKey: string;
  icon: typeof HelpCircle;
  enabled: boolean;
};

const STUDIO_ACTION_TILES: TileSpec[] = [
  {
    id: "quiz",
    labelKey: "quiz",
    descriptionKey: "testComprehension",
    icon: HelpCircle,
    enabled: true,
  },
  {
    id: "flashcard",
    labelKey: "flashcards",
    descriptionKey: "keyVocabulary",
    icon: Layers,
    enabled: false,
  },
  {
    id: "summary",
    labelKey: "summary",
    descriptionKey: "summaryDescription",
    icon: BookOpen,
    enabled: false,
  },
  {
    id: "mindmap",
    labelKey: "mindMap",
    descriptionKey: "visualOverview",
    icon: Network,
    enabled: false,
  },
  {
    id: "chat",
    labelKey: "chat",
    descriptionKey: "askQuestions",
    icon: MessageCircle,
    enabled: true,
  },
  {
    id: "lookup",
    labelKey: "translate",
    descriptionKey: "vietnameseTranslation",
    icon: Languages,
    enabled: true,
  },
];

export function isStudioTileEnabled(actionId: StudioActionId): boolean {
  const tile = STUDIO_ACTION_TILES.find((t) => t.id === actionId);
  return tile?.enabled ?? false;
}

export function StudioActionGrid({
  hasActivePassage,
  runningCount,
  isActionLocked,
  onSelect,
  t,
}: {
  hasActivePassage: boolean;
  runningCount: number;
  isActionLocked: (id: StudioActionId) => boolean;
  onSelect: (id: StudioActionId) => void;
  t: ReturnType<typeof useTranslations<"Study">>;
}) {
  return (
    <div className="px-3 pt-3 grid grid-cols-2 gap-2">
      {STUDIO_ACTION_TILES.map((tile) => {
        const enabled = tile.enabled;
        const locked = enabled && hasActivePassage && isActionLocked(tile.id);
        const isOverCap =
          enabled &&
          hasActivePassage &&
          runningCount >= 3 &&
          tile.id !== "chat" &&
          tile.id !== "lookup" &&
          !locked;
        const disabled = !enabled || !hasActivePassage || isOverCap;

        return (
          <button
            key={tile.id}
            type="button"
            onClick={() => !disabled && onSelect(tile.id)}
            disabled={disabled}
            aria-label={t(tile.labelKey)}
            title={!enabled ? t("comingSoon") : t(tile.descriptionKey)}
            className={cn(
              "relative overflow-hidden flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-[14px] border bg-surface transition-all",
              !disabled &&
                "border-border hover:border-primary hover:-translate-y-px hover:shadow-card cursor-pointer",
              disabled && "border-border opacity-50 cursor-not-allowed",
            )}
          >
            {locked && (
              <div className="absolute inset-0 z-0 bg-accent animate-[upload-fill_2.8s_ease-in-out_forwards]">
                <div className="absolute inset-y-0 w-16 right-0 bg-linear-to-r from-transparent via-white/55 to-transparent animate-[upload-shimmer_1.4s_ease-in-out_infinite]" />
              </div>
            )}
            <tile.icon
              className={cn(
                "relative z-10",
                disabled ? "text-muted-foreground/60" : "text-primary",
              )}
              strokeWidth={2}
              size={21}
            />
            <span
              className={cn(
                "relative z-10 text-[11.5px] font-semibold text-center leading-tight",
                disabled ? "text-muted-foreground/70" : "text-foreground",
              )}
            >
              {t(tile.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StudioLibraryHeader({
  count,
  t,
}: {
  count: number;
  t: ReturnType<typeof useTranslations<"Study">>;
}) {
  return (
    <div className="flex items-center gap-2.5 pt-5 px-4 pb-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t("library")}
      </span>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-bold text-ink-3">{count}</span>
    </div>
  );
}

export function StudioEmptyState({
  hasActivePassage,
  t,
}: {
  hasActivePassage: boolean;
  t: ReturnType<typeof useTranslations<"Study">>;
}) {
  if (hasActivePassage) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-3" />
        <p className="text-[13px] text-muted-foreground/60">
          {t("noResultsYet")}
        </p>
        <p className="text-[11px] text-muted-foreground/40 mt-1">
          {t("clickCardToGenerate")}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <BookOpen className="w-8 h-8 text-muted-foreground/30 mb-3" />
      <p className="text-[13px] text-muted-foreground/60">
        {t("selectPassage")}
      </p>
      <p className="text-[11px] text-muted-foreground/40 mt-1">
        {t("uploadOrSelectSources")}
      </p>
    </div>
  );
}

export function StudioComingSoon({
  Icon,
  label,
  t,
}: {
  Icon: typeof HelpCircle;
  label: string;
  t: ReturnType<typeof useTranslations<"Study">>;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center px-8 py-12">
      <div className="w-14 h-14 rounded-[14px] bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold text-foreground mb-1">{label}</p>
      <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
    </div>
  );
}
