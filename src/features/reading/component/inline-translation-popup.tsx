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
import { Bookmark, Languages, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useMemo, useEffect } from "react";

import { Button } from "@/component/ui/button";
import type { Translation } from "@/features/reading/schema";
import type { PartOfSpeech } from "@/generated/prisma/enums";
import type { WordSelectionAnchor } from "@/features/reading/utils/word-selection";

interface InlineTranslationPopupProps {
  anchor: WordSelectionAnchor | null;
  data: Translation | null;
  error: Error | null;
  isPending: boolean;
  isSaving: boolean;
  isSaved?: boolean;
  onTranslate: () => void;
  onClose: () => void;
  onSave: () => void;
}

const PART_OF_SPEECH_LABEL: Record<Exclude<PartOfSpeech, "OTHER">, string> = {
  NOUN: "danh từ",
  VERB: "động từ",
  ADJECTIVE: "tính từ",
  ADVERB: "trạng từ",
  PREPOSITION: "giới từ",
  CONJUNCTION: "liên từ",
  PHRASE:"cụm từ"
};

function partOfSpeechBadge(data: Translation): { label: string; aria: string } | null {
  if (data.partOfSpeech === "OTHER") return null;
  const label = PART_OF_SPEECH_LABEL[data.partOfSpeech];
  return { label, aria: `Loại từ: ${label}` };
}

export function InlineTranslationPopup({
  anchor,
  data,
  error,
  isPending,
  isSaving,
  isSaved = false,
  onTranslate,
  onClose,
  onSave,
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
      offset(10),
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
    escapeKey: !isExpanded,
    outsidePress: !isExpanded,
  });
  const role = useRole(floatingContext, {
    role: isExpanded ? "dialog" : "tooltip",
  });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!anchor) return null;

  const word = anchor.word;
  const lemma = data?.lemma ?? "";
  const translation = data?.translation?.trim() ?? "";
  const posBadge = data ? partOfSpeechBadge(data) : null;

  return (
    <FloatingPortal>
      <div
        // eslint-disable-next-line react-hooks/refs
        ref={setFloating}
        style={floatingStyles}
        className={
          isExpanded
            ? "z-50 w-max min-w-[210px] max-w-[min(20rem,calc(100vw-1rem))] rounded-[18px] border border-border bg-surface p-3.5 text-foreground shadow-popup"
            : "z-50"
        }
        {...getFloatingProps()}
      >
        {!isExpanded ? (
          <Button
            type="button"
            size="xs"
            onClick={onTranslate}
            aria-label={`Dịch từ ${word}`}
            // before: pseudo-element extends the tap area to 44px without changing the pill's visual size
            className="relative gap-1.5 rounded-full px-3 before:absolute before:-inset-2 before:content-['']"
          >
            <Languages />
            Dịch
          </Button>
        ) : (
          <div aria-live="polite">
            {isPending ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang dịch...
                </div>
                <button
                  type="button"
                  onMouseDown={onClose}
                  onTouchStart={onClose}
                  aria-label="Đóng bản dịch"
                  className="relative ml-auto flex size-[30px] shrink-0 items-center justify-center rounded-[9px] text-foreground transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X className="size-[19px]" strokeWidth={2.2} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <p
                    title={lemma}
                    className="truncate font-serif text-[17px] leading-[1.35] font-semibold text-foreground"
                  >
                    {lemma}
                  </p>

                  {error ? (
                    <p className="mt-1 text-sm text-coral">
                      Không thể dịch từ này. Vui lòng thử lại.
                    </p>
                  ) : translation ? (
                    <>
                      {posBadge && (
                        <span
                          aria-label={posBadge.aria}
                          className="mt-1.5 inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-[3px] text-[10px] font-bold tracking-[0.07em] uppercase text-muted-foreground"
                        >
                          {posBadge.label}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Không tìm thấy bản dịch
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onMouseDown={onClose}
                  onTouchStart={onClose}
                  aria-label="Đóng bản dịch"
                  className="relative flex size-[30px] shrink-0 items-center justify-center rounded-[9px] text-foreground transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X className="size-[19px]" strokeWidth={2.2} />
                </button>
              </div>
            )}

            {translation && !isPending && !error && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="font-serif text-[19px] leading-[1.35] font-semibold text-primary">
                  {translation}
                </p>

                {/* Selected source text — repeats the headword, since translation is single-word */}
                <div className="mt-3 border-t border-border pt-[11px] text-[13px] leading-normal text-ink-3">
                  Văn bản đã chọn:{" "}
                  <span className="font-serif text-sm font-semibold text-foreground">
                    {word}
                  </span>
                </div>

                <Button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving || isSaved}
                  aria-label={isSaved ? "Đã lưu từ vựng" : "Lưu từ vựng"}
                  className="mt-3 w-full gap-[7px] rounded-[12px] text-[13px]"
                >
                  <Bookmark className="size-3.5" />
                  {isSaving ? "Đang lưu..." : isSaved ? "Đã lưu" : "Lưu"}
                </Button>
              </div>
            )}

            {(error || (!isPending && !translation)) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onTranslate}
                className="mt-3"
              >
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
