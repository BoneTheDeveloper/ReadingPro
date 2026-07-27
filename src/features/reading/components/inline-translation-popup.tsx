"use client";

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { Languages, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useMemo, useEffect } from "react";

import { Button } from "@/components/ui/button";
import type { TranslationState } from "@/features/reading/hooks/use-word-translation";
import type { WordSelectionAnchor } from "@/features/reading/utils/selection-to-word-selection";

interface InlineTranslationPopupProps {
  anchor: WordSelectionAnchor | null;
  state: TranslationState;
  onTranslate: () => void;
  onClose: () => void;
}

export function InlineTranslationPopup({
  anchor,
  state,
  onTranslate,
  onClose,
}: InlineTranslationPopupProps) {
  const open = anchor !== null;
  const { context, floatingStyles, refs } = useFloating({
    open,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) onClose();
    },
    placement: "bottom",
    strategy: "fixed",
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ["top"] }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });
  // Floating UI exposes callback setters through `refs`; these do not read a
  // ref's `.current` value during render. React's refs lint rule cannot
  // distinguish this documented API from a mutable ref access.
  // eslint-disable-next-line react-hooks/refs
  const setFloating = refs.setFloating;
  // eslint-disable-next-line react-hooks/refs
  const setPositionReference = refs.setPositionReference;

  const virtualReference = useMemo(
    () =>
      anchor
        ? {
            getBoundingClientRect: () => anchor.range.getBoundingClientRect(),
          }
        : null,
    [anchor],
  );

  useEffect(() => {
    setPositionReference(virtualReference);
    // Floating UI callback setter; not a mutable-ref read.
    // eslint-disable-next-line react-hooks/refs
  }, [setPositionReference, virtualReference]);

  const dismiss = useDismiss(context, {
    enabled: open,
    escapeKey: true,
    outsidePress: true,
  });
  const role = useRole(context, {
    role: state.status === "ready" ? "tooltip" : "dialog",
  });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!anchor) return null;

  const word = anchor.selection.selectedText;
  const translation = state.data?.translation?.trim() ?? "";
  const compact = state.status === "ready" || state.status === "idle";

  return (
    <FloatingPortal>
      <div
        // eslint-disable-next-line react-hooks/refs
        ref={setFloating}
        style={floatingStyles}
        className={
          compact
            ? "z-50"
            : "z-50 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-border bg-surface p-4 text-foreground shadow-[0_4px_12px_rgba(0,0,0,.06),0_18px_40px_rgba(0,0,0,.10)]"
        }
        {...getFloatingProps()}
      >
        {compact ? (
          <button
            type="button"
            onClick={onTranslate}
            aria-label={`Dịch từ ${word}`}
            className="flex size-9 items-center justify-center rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-indigo transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Languages className="size-4" />
          </button>
        ) : (
          <div className="space-y-3" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {word}
                </p>
                {state.status === "loading" ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang dịch...
                  </div>
                ) : state.status === "success" && translation ? (
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {translation}
                  </p>
                ) : state.status === "success" ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Không tìm thấy bản dịch
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-coral">
                    Không thể dịch từ này. Vui lòng thử lại.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng bản dịch"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {(state.status === "error" ||
              (state.status === "success" && !translation)) && (
              <Button type="button" variant="secondary" size="sm" onClick={onTranslate}>
                <RotateCcw />
                Thử lại
              </Button>
            )}

            {state.status === "success" && translation && (
              <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                Google Translate
              </p>
            )}
          </div>
        )}
      </div>
    </FloatingPortal>
  );
}
