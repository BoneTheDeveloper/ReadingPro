"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Languages, Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";
import type { TranslationSelection } from "./study-types";
import type { QuickTranslationData } from "./study-types";

interface StudyTranslationPopupProps {
  selection: TranslationSelection;
  translation: QuickTranslationData | null;
  loading: boolean;
  error: string | null;
  saved: boolean;
  onOpenDetails: () => void;
  onSave: () => void;
  onDismiss: () => void;
}

const POPUP_WIDTH = 280;
const POPUP_OFFSET_Y = 8;

export function StudyTranslationPopup({
  selection,
  translation,
  loading,
  error,
  saved,
  onOpenDetails,
  onSave,
  onDismiss,
}: StudyTranslationPopupProps) {
  const t = useTranslations("Study");
  const popupRef = useRef<HTMLDivElement>(null);

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
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
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

  // Position: prefer below selection, flip above if too close to bottom
  const spaceBelow = viewportHeight - rect.top - rect.height;
  const showAbove = spaceBelow < 200;
  const top = showAbove
    ? rect.top - POPUP_OFFSET_Y
    : rect.top + rect.height + POPUP_OFFSET_Y;

  // Horizontal: center on selection, clamp to viewport
  const left = Math.max(
    8,
    Math.min(
      rect.left + rect.width / 2 - POPUP_WIDTH / 2,
      viewportWidth - POPUP_WIDTH - 8,
    ),
  );

  return (
    <div
      ref={popupRef}
      className={cn(
        "fixed z-50 bg-popover border border-border rounded-lg shadow-lg",
        "w-[280px] p-3",
      )}
      style={{ top, left }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Languages className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("translationPopupTitle")}
        </span>
      </div>

      {/* Selected text preview */}
      <p className="text-sm font-medium text-foreground mb-2 line-clamp-1">
        {selection.selectedText}
      </p>

      {/* Translation content */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">
            {t("translationLoading")}
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive py-1">{t("translationError")}</p>
      )}

      {translation && (
        <div className="mb-2">
          <p className="text-sm text-foreground">{translation.translation}</p>
          {translation.type && (
            <span className="inline-block mt-1 text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {translation.type}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {!loading && (translation || error) && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {translation && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={onOpenDetails}
              >
                <ExternalLink className="w-3 h-3" />
                {t("openDetails")}
              </Button>
              <Button
                variant={saved ? "ghost" : "outline"}
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1.5",
                  saved && "text-muted-foreground",
                )}
                onClick={saved ? undefined : onSave}
                disabled={saved}
              >
                <Bookmark
                  className={cn("w-3 h-3", saved && "fill-current")}
                />
                {saved ? t("vocabularySaved") : t("saveVocabulary")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
