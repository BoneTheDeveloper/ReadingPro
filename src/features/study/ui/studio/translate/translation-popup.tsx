"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Languages, ExternalLink, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";
import type { TranslationSelection } from "@/features/study/model/types";
import type { QuickTranslationData } from "@/features/study/model/types";

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
const VIEWPORT_MARGIN = 8;
const ICON_VIEWPORT_PADDING = 40;
const CURSOR_ICON_OFFSET = 6;

export function calculateStudyTranslationPopupPosition(input: {
  selectionRect: TranslationSelection["selectionRect"];
  viewportWidth: number;
  viewportHeight: number;
  popupWidth?: number;
  popupHeight: number;
  offsetY?: number;
}) {
  const {
    selectionRect,
    viewportWidth,
    viewportHeight,
    popupWidth = POPUP_WIDTH,
    popupHeight,
    offsetY = POPUP_OFFSET_Y,
  } = input;

  const spaceBelow = viewportHeight - selectionRect.top - selectionRect.height;
  const showAbove = spaceBelow < popupHeight + offsetY;
  const unclampedTop = showAbove
    ? selectionRect.top - popupHeight - offsetY
    : selectionRect.top + selectionRect.height + offsetY;
  const maxTop = Math.max(VIEWPORT_MARGIN, viewportHeight - popupHeight - VIEWPORT_MARGIN);

  return {
    top: Math.max(VIEWPORT_MARGIN, Math.min(unclampedTop, maxTop)),
    left: Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        selectionRect.left + selectionRect.width / 2 - popupWidth / 2,
        viewportWidth - popupWidth - VIEWPORT_MARGIN,
      ),
    ),
    showAbove,
  };
}

export function calculateStudyTranslationIconPosition(input: {
  selectionRect: TranslationSelection["selectionRect"];
  actionRect?: TranslationSelection["actionRect"];
  viewportWidth: number;
}) {
  const rect = input.actionRect ?? input.selectionRect;
  const isCursorPoint = rect.width === 0 && rect.height === 0;
  const iconTop = isCursorPoint
    ? rect.top + CURSOR_ICON_OFFSET
    : rect.top + rect.height + 2;
  const iconLeft = Math.min(
    rect.left + rect.width + (isCursorPoint ? CURSOR_ICON_OFFSET : -8),
    input.viewportWidth - ICON_VIEWPORT_PADDING,
  );

  return {
    top: iconTop,
    left: Math.max(VIEWPORT_MARGIN, iconLeft),
  };
}

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
  const [panelHeight, setPanelHeight] = useState(POPUP_ESTIMATED_HEIGHT);

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

  useLayoutEffect(() => {
    if (status === "ready") return;

    const nextHeight = panelRef.current?.getBoundingClientRect().height;
    if (nextHeight && Math.abs(nextHeight - panelHeight) > 1) {
      setPanelHeight(nextHeight);
    }
  }, [panelHeight, selection.selectedText, status, translation?.translation, translation?.type]);

  // Compact icon mode: positioned near the user's selection release point.
  if (status === "ready") {
    const iconPosition = calculateStudyTranslationIconPosition({
      selectionRect: rect,
      actionRect: selection.actionRect,
      viewportWidth,
    });

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
        style={iconPosition}
      >
        <Languages className="w-4 h-4" />
      </button>
    );
  }

  // Full popup panel: loading / success / error
  const { top, left } = calculateStudyTranslationPopupPosition({
    selectionRect: rect,
    viewportWidth,
    viewportHeight,
    popupHeight: panelHeight,
  });

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
