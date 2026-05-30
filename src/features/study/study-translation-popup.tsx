"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Languages, ExternalLink, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";
import type { TranslationSelection } from "./study-types";
import type { QuickTranslationData } from "./study-types";

type QuickTranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

interface StudyTranslationPopupProps {
  selection: TranslationSelection;
  translation: QuickTranslationData | null;
  status: QuickTranslationStatus;
  onTranslate: () => void;
  onOpenDetails: () => void;
  onDismiss: () => void;
}

const POPUP_WIDTH = 280;
const POPUP_OFFSET_Y = 8;
const POPUP_ESTIMATED_HEIGHT = 120;

export function StudyTranslationPopup({
  selection,
  translation,
  status,
  onTranslate,
  onOpenDetails,
  onDismiss,
}: StudyTranslationPopupProps) {
  const t = useTranslations("Study");
  const iconRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Dismiss on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  // Dismiss on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const el = iconRef.current ?? panelRef.current;
      if (el && !el.contains(e.target as Node)) {
        onDismiss();
      }
    }
    // Delay to avoid the same mouseup that triggered selection
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onDismiss]);

  const rect = selection.selectionRect;
  const viewportHeight = window.innerHeight;
  const viewportWidth = document.documentElement.clientWidth;

  // Compact icon mode: positioned at bottom-right of selection to avoid GT extension overlap
  if (status === "ready") {
    const iconTop = rect.top + rect.height + 2;
    const iconLeft = Math.min(
      rect.left + rect.width - 8,
      viewportWidth - 40,
    );

    return (
      <button
        ref={iconRef}
        type="button"
        onClick={onTranslate}
        aria-label={t("translateSelection")}
        className={cn(
          "fixed z-50 flex items-center justify-center",
          "w-8 h-8 rounded-full",
          "bg-primary text-primary-foreground shadow-md",
          "hover:bg-primary/90 active:scale-95",
          "transition-all duration-150",
        )}
        style={{ top: iconTop, left: Math.max(8, iconLeft) }}
      >
        <Languages className="w-4 h-4" />
      </button>
    );
  }

  // Full popup panel: loading / success / error
  const spaceBelow = viewportHeight - rect.top - rect.height;
  const showAbove = spaceBelow < POPUP_ESTIMATED_HEIGHT + POPUP_OFFSET_Y;
  const top = showAbove
    ? Math.max(8, rect.top - POPUP_ESTIMATED_HEIGHT - POPUP_OFFSET_Y)
    : rect.top + rect.height + POPUP_OFFSET_Y;

  const left = Math.max(
    8,
    Math.min(
      rect.left + rect.width / 2 - POPUP_WIDTH / 2,
      viewportWidth - POPUP_WIDTH - 8,
    ),
  );

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed z-50 bg-popover border border-border rounded-lg shadow-lg",
        "w-[280px]",
      )}
      style={{ top, left }}
    >
      {/* Source section */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
            aria-label={t("listenSource")}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm text-foreground line-clamp-2">
            {selection.selectedText}
          </p>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Translation section */}
      <div className="px-3 pt-2 pb-3">
        {status === "loading" && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">
              {t("translationLoading")}
            </span>
          </div>
        )}

        {status === "error" && (
          <div>
            <p className="text-sm text-destructive py-1">{t("translationError")}</p>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={onTranslate}
            >
              {t("tryAgain")}
            </button>
          </div>
        )}

        {status === "success" && translation && (
          <div>
            {/* Main translation with speaker on the left */}
            <div className="flex items-start gap-1.5">
              <button
                type="button"
                className="p-0.5 mt-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                aria-label={t("listenTranslation")}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{translation.translation}</p>
              </div>
            </div>

            {/* Type badge */}
            {translation.type && (
              <div className="mt-1 ml-[22px]">
                <span className="text-[11px] italic text-muted-foreground">
                  {translation.type}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={onOpenDetails}
              >
                <ExternalLink className="w-3 h-3" />
                {t("openDetails")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
