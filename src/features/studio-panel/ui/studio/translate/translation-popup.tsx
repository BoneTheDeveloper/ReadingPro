"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TranslationSelection, QuickTranslationData } from "@/features/reading/schemas/translation.schema";

type QuickTranslationStatus =
  "idle" | "ready" | "loading" | "success" | "error";

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
  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    viewportHeight - popupHeight - VIEWPORT_MARGIN,
  );

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
  }, [
    panelHeight,
    selection.selectedText,
    status,
    translation?.translation,
    translation?.type,
  ]);

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
        "fixed z-50 bg-surface border border-border rounded-xl shadow-xl",
        "w-[340px]",
      )}
      style={{ top, left }}
    >
      {status === "loading" && (
        <div className="px-4 py-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">
            {t("translationLoading")}
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="px-4 py-4">
          <p className="text-sm text-destructive py-1">
            {t("translationError")}
          </p>
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
        <>
          {/* Header row: source word + US/UK pill */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3">
            <p className="text-base font-semibold text-foreground line-clamp-1 flex-1 min-w-0">
              {selection.selectedText}
            </p>
            <div className="shrink-0 inline-flex bg-paper border border-border p-[3px]">
              <button
                type="button"
                className="px-3 py-1 text-[12px] font-semibold rounded bg-surface text-primary shadow-sm"
              >
                US
              </button>
              <button
                type="button"
                className="px-3 py-1 text-[12px] font-semibold text-muted-foreground"
              >
                UK
              </button>
            </div>
          </div>

          {/* Translation word */}
          <div className="px-4 pb-3">
            <p className="text-lg font-semibold text-primary leading-tight">
              {translation.translation.replace(/^\W+|\W+$/g, "")}
            </p>
          </div>

          {/* Description */}
          {translation.type && (
            <div className="px-4 pb-3">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {translation.type}
              </p>
            </div>
          )}

          <div className="h-px bg-border/30 mx-4" />

          {/* Save / Details buttons */}
          <div className="px-4 pt-3 pb-4 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-[13px] font-semibold gap-1.5"
              onClick={onOpenDetails}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
              {t("save")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-[13px] font-semibold gap-1.5 text-primary"
              onClick={onOpenDetails}
            >
              {t("openDetails")}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
