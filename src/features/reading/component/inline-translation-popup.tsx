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

import { Button } from "@/component/ui/button";
import type { PartOfSpeech, Translation } from "@/features/reading/schema";
import type { WordSelectionAnchor } from "@/features/reading/utils/word-selection";

interface InlineTranslationPopupProps {
  anchor: WordSelectionAnchor | null;
  data: Translation | null;
  error: Error | null;
  isPending: boolean;
  onTranslate: () => void;
  onClose: () => void;
}

const PART_OF_SPEECH_LABEL: Record<Exclude<PartOfSpeech, "unknown">, string> = {
  noun: "danh từ",
  verb: "động từ",
  adjective: "tính từ",
  adverb: "trạng từ",
  pronoun: "đại từ",
  preposition: "giới từ",
  conjunction: "liên từ",
  interjection: "thán từ",
  determiner: "loại từ",
};

function partOfSpeechBadge(data: Translation): { label: string; aria: string } | null {
  if (data.partOfSpeech === "unknown") return null;
  const label = PART_OF_SPEECH_LABEL[data.partOfSpeech];
  return { label, aria: `Loại từ: ${label}` };
}

export function InlineTranslationPopup({
  anchor,
  data,
  error,
  isPending,
  onTranslate,
  onClose,
}: InlineTranslationPopupProps) {
  const isOpen = anchor !== null;
  const isExpanded = isPending || data !== null || error !== null;

  const { context: floatingContext, floatingStyles, refs } = useFloating({
    open: isOpen,
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
  const setFloating = refs.setFloating;
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
    // eslint-disable-next-line react-hooks/refs
  }, [setPositionReference, virtualReference]);

  const dismiss = useDismiss(floatingContext, {
    enabled: isOpen,
    escapeKey: true,
    outsidePress: false,
  });
  const role = useRole(floatingContext, {
    role: isExpanded ? "dialog" : "tooltip",
  });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!anchor) return null;

  const word = anchor.word;
  const translation = data?.translation?.trim() ?? "";
  const ipa = data?.ipa ?? null;
  const posBadge = data ? partOfSpeechBadge(data) : null;

  return (
    <FloatingPortal>
      <div
        // eslint-disable-next-line react-hooks/refs
        ref={setFloating}
        style={floatingStyles}
        className={
          isExpanded
            ? "z-50 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-border bg-surface p-4 text-foreground shadow-[0_4px_12px_rgba(0,0,0,.06),0_18px_40px_rgba(0,0,0,.10)]"
            : "z-50"
        }
        {...getFloatingProps()}
      >
        {!isExpanded ? (
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
              <div className="min-w-0">
                <p
                  title={word}
                  className="truncate text-base font-semibold text-foreground"
                >
                  {word}
                </p>

                {isPending ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang dịch...
                  </div>
                ) : error ? (
                  <p className="mt-1 text-sm text-coral">
                    Không thể dịch từ này. Vui lòng thử lại.
                  </p>
                ) : translation ? (
                  <div className="mt-1 space-y-1">
                    {ipa !== null && (
                      <p
                        title={ipa}
                        className="truncate font-mono text-xs text-muted-foreground"
                      >
                        {ipa}
                      </p>
                    )}
                    {posBadge && (
                      <span
                        aria-label={posBadge.aria}
                        className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        {posBadge.label}
                      </span>
                    )}
                    <p className="text-lg font-semibold text-foreground">
                      {translation}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Không tìm thấy bản dịch
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

            {(error || (!isPending && !translation)) && (
              <Button type="button" variant="secondary" size="sm" onClick={onTranslate}>
                <RotateCcw />
                Thử lại
              </Button>
            )}
          </div>
        )}
      </div>
    </FloatingPortal>
  );
}
