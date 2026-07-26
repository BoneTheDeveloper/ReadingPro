"use client";

import { useEffect, useMemo, useState } from "react";
import {
  autoUpdate,
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Loader2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

import type {
  TranslationDto,
  WordSelection,
} from "@/features/reading/schemas/translation";
import type { SelectionRect } from "@/features/reading/lib/selection-utils";

type QuickTranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

interface TranslationPopupProps {
  word: WordSelection;
  anchorRect: SelectionRect;
  translation: TranslationDto | null;
  status: QuickTranslationStatus;
  onTranslate: () => void;
  onDismiss: () => void;
  /**
   * Phase 2: the Save button is disabled and does not call onSave. The prop
   * stays in the interface so `content-panel.tsx` does not need to refactor
   * when the vocabulary-save-toggle plan replaces the no-op vocabulary hook.
   * Underscore-prefixed to satisfy the unused-args lint rule.
   */
  _onSave?: () => void;
  _saved?: boolean;
}

const POPUP_WIDTH = 240;

export function TranslationPopup({
  word,
  anchorRect,
  translation,
  status,
  onTranslate,
  onDismiss,
}: TranslationPopupProps) {
  const isIcon = status === "ready";

  // Treat the selection rect as a non-DOM reference for Floating UI.
  const reference = useMemo(
    () => ({
      getBoundingClientRect() {
        return {
          top: anchorRect.top,
          left: anchorRect.left,
          right: anchorRect.left + anchorRect.width,
          bottom: anchorRect.top + anchorRect.height,
          width: anchorRect.width,
          height: anchorRect.height,
          x: anchorRect.left,
          y: anchorRect.top,
          toJSON: () => ({}),
        };
      },
    }),
    [anchorRect],
  );

  const { refs, floatingStyles, update } = useFloating({
    placement: isIcon ? "bottom-start" : "top",
    strategy: "fixed",
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  // Register the virtual reference once per render.
  useEffect(() => {
    refs.setReference(reference);
  }, [reference, refs]);

  // Keep the popup anchored to the rect while mounted.
  useEffect(() => {
    const floatingEl = refs.floating.current;
    if (!floatingEl) return;
    return autoUpdate(reference, floatingEl, update, { animationFrame: false });
  }, [reference, refs.floating, update, word.selectedText]);

  // Escape dismisses.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  // Outside-click dismisses. Delayed attach so the selection `mouseup` that
  // opened the popup does not immediately close it.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setArmed(true), 100);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!armed) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      const root = document.querySelector("[data-translation-popup-root]");
      if (target && root && root.contains(target)) return;
      onDismiss();
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [armed, onDismiss]);

  const popupStyleWithWidth: React.CSSProperties = {
    ...floatingStyles,
    width: POPUP_WIDTH,
  };

  // Not found: render an empty state (no panel / icon).
  if (
    status === "success" &&
    translation &&
    translation.translation === null
  ) {
    return (
      <FloatingPortal>
        <div
          ref={refs.setFloating}
          data-translation-popup-root
          className="bg-surface border border-border rounded-xl shadow-xl px-4 py-3 text-sm text-muted-foreground"
          style={popupStyleWithWidth}
        >
          Không tìm thấy bản dịch
        </div>
      </FloatingPortal>
    );
  }

  // Icon: small floating circle, click triggers translate.
  if (isIcon) {
    return (
      <FloatingPortal>
        <button
          ref={refs.setFloating}
          type="button"
          onClick={onTranslate}
          aria-label="Dịch"
          data-translation-popup-root
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all duration-150"
          style={floatingStyles}
        >
          <Languages className="w-4 h-4" />
        </button>
      </FloatingPortal>
    );
  }

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        data-translation-popup-root
        className="bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
        style={popupStyleWithWidth}
      >
        {status === "loading" && (
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Đang dịch...</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 rounded bg-muted animate-pulse w-4/5" />
              <div className="h-2.5 rounded bg-muted animate-pulse w-3/5" />
              <div className="h-2.5 rounded bg-muted animate-pulse w-2/5" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="px-4 py-4">
            <p className="text-sm text-destructive py-1">Dịch thất bại</p>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={onTranslate}
            >
              Thử lại
            </button>
          </div>
        )}

        {status === "success" && translation && translation.translation && (
          <>
            <div className="px-4 pt-4 pb-2">
              <p className="text-base font-semibold text-foreground line-clamp-1">
                {word.selectedText}
              </p>
            </div>
            <div className="px-4 pb-3">
              <p className="text-lg font-semibold text-primary leading-tight line-clamp-2">
                {translation.translation}
              </p>
            </div>
            <div className="px-4 pb-3 space-y-1">
              <p className="text-[13px] text-muted-foreground">
                <span className="font-medium">IPA:</span> —
              </p>
              <p className="text-[13px] text-muted-foreground">
                <span className="font-medium">POS:</span> —
              </p>
              <p className="text-[13px] text-muted-foreground line-clamp-2">
                <span className="font-medium">Nghĩa:</span>{" "}
                {translation.translation ?? "—"}
              </p>
            </div>
            <div className="h-px bg-border/30 mx-4" />
            <div className="px-4 pt-3 pb-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 flex-1 text-[13px] font-semibold"
              >
                Lưu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="h-8 text-[13px] font-semibold text-muted-foreground"
              >
                Chi tiết
              </Button>
            </div>
          </>
        )}
      </div>
    </FloatingPortal>
  );
}
