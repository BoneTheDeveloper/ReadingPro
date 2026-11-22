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
import { Bookmark, Languages, LoaderCircle, PanelRight, Puzzle, RotateCcw, X } from "lucide-react";
import { useMemo, useEffect } from "react";

import { Button } from "@/client/components/ui/button";
import { PART_OF_SPEECH_LABEL, findContextIdiom } from "@/client/features/dictionary";
import type { MatchedDictionaryEntry } from "@/shared/dictionary/schema";
import type { Translation } from "@/shared/reading/schema";
import type { WordSelectionAnchor } from "../lib/word-selection";

const POPUP_MEANINGS = 3;

/** Pro only: what the expanded popup shows. */
export type InlineLookupState = {
  /** Dictionary entries; empty when the word is not in the dictionary. */
  entries: MatchedDictionaryEntry[];
  dictionaryPending: boolean;
  /** Null while pending or after a failure; the popup then offers a retry. */
  ai: Translation | null;
  aiPending: boolean;
};

interface InlineTranslationPopupProps {
  anchor: WordSelectionAnchor | null;
  /** Null until the user presses Dịch; a Free user's Dịch opens Studio instead. */
  lookup: InlineLookupState | null;
  isSaving: boolean;
  isSaved?: boolean;
  onTranslate: () => void;
  onRetryAi: () => void;
  onClose: () => void;
  onSave: () => void;
  onOpenDetail: () => void;
}

/** The context idiom first, then the general groups, flattened to the first few meanings. */
function topMeanings(entry: MatchedDictionaryEntry, anchor: WordSelectionAnchor) {
  const idiom = findContextIdiom(entry, anchor.word, anchor.context);
  const senses = [...(idiom ? [idiom] : []), ...entry.senses.filter((s) => s.kind === "word")];
  const groups = senses.length > 0 ? senses : entry.senses;
  return groups
    .flatMap((sense) =>
      sense.meanings.map((meaning, i) => ({
        text: meaning.text,
        // The group label goes on its first meaning only.
        label:
          i > 0
            ? null
            : sense === idiom
              ? `Theo câu · ${sense.label}`
              : sense.kind === "idiom"
                ? sense.label
                : PART_OF_SPEECH_LABEL[sense.partOfSpeech],
      })),
    )
    .slice(0, POPUP_MEANINGS);
}

export function InlineTranslationPopup({
  anchor,
  lookup,
  isSaving,
  isSaved = false,
  onTranslate,
  onRetryAi,
  onClose,
  onSave,
  onOpenDetail,
}: InlineTranslationPopupProps) {
  const isOpen = anchor !== null;
  const isExpanded = lookup !== null;

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
  const closeButton = (
    <button
      type="button"
      onMouseDown={onClose}
      onTouchStart={onClose}
      aria-label="Đóng bản dịch"
      className="relative ml-auto flex size-[30px] shrink-0 items-center justify-center rounded-[9px] text-foreground transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <X className="size-[19px]" strokeWidth={2.2} />
    </button>
  );

  return (
    <FloatingPortal>
      <div
        // eslint-disable-next-line react-hooks/refs
        ref={setFloating}
        style={floatingStyles}
        className={
          isExpanded
            ? "z-50 w-max min-w-[240px] max-w-[min(21rem,calc(100vw-1rem))] rounded-[18px] border border-border bg-surface p-3.5 text-foreground shadow-popup"
            : "z-50"
        }
        {...getFloatingProps()}
      >
        {!lookup ? (
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
          <ExpandedLookup
            anchor={anchor}
            lookup={lookup}
            closeButton={closeButton}
            isSaving={isSaving}
            isSaved={isSaved}
            onRetryAi={onRetryAi}
            onSave={onSave}
            onOpenDetail={onOpenDetail}
          />
        )}
      </div>
    </FloatingPortal>
  );
}

interface ExpandedLookupProps {
  anchor: WordSelectionAnchor;
  lookup: InlineLookupState;
  closeButton: React.ReactNode;
  isSaving: boolean;
  isSaved: boolean;
  onRetryAi: () => void;
  onSave: () => void;
  onOpenDetail: () => void;
}

function ExpandedLookup({
  anchor,
  lookup,
  closeButton,
  isSaving,
  isSaved,
  onRetryAi,
  onSave,
  onOpenDetail,
}: ExpandedLookupProps) {
  const [entry, base] = lookup.entries;
  const meanings = entry ? topMeanings(entry, anchor) : [];
  const ai = lookup.ai;
  const headword = entry?.displayHeadword ?? ai?.lemma ?? anchor.word;

  return (
    <div aria-live="polite">
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p title={headword} className="truncate font-serif text-[17px] leading-[1.35] font-semibold text-foreground">
            {headword}
          </p>
          {entry?.phonetic && <p className="text-[12px] text-muted-foreground">/{entry.phonetic}/</p>}
          {base && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-3">
              <Puzzle className="size-3 text-primary" aria-hidden />
              Dạng gốc: {base.displayHeadword}
            </p>
          )}
        </div>
        {closeButton}
      </div>

      {lookup.dictionaryPending ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tra từ điển...
        </p>
      ) : (
        meanings.length > 0 && (
          <ol className="mt-2 space-y-1">
            {meanings.map((meaning, i) => (
              <li key={i} className="text-[13.5px] leading-snug">
                {meaning.label && (
                  <span className="block text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                    {meaning.label}
                  </span>
                )}
                {meaning.text}
              </li>
            ))}
          </ol>
        )
      )}

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-3">Theo ngữ cảnh (AI)</p>
        {lookup.aiPending ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Đang dịch...
          </p>
        ) : ai ? (
          <>
            <p className="mt-1 font-serif text-[19px] leading-[1.35] font-semibold text-primary">{ai.translation}</p>
            <p className="text-[11.5px] text-muted-foreground">
              {ai.lemma} · {PART_OF_SPEECH_LABEL[ai.partOfSpeech]}
            </p>
          </>
        ) : (
          <div className="mt-1 flex items-center gap-2 text-sm text-coral">
            Không thể dịch theo ngữ cảnh.
            <Button type="button" variant="secondary" size="xs" onClick={onRetryAi}>
              <RotateCcw />
              Thử lại
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={!ai || isSaving || isSaved}
          aria-label={isSaved ? "Đã lưu từ vựng" : "Lưu nghĩa theo ngữ cảnh"}
          className="flex-1 gap-[7px] rounded-[12px] text-[13px]"
        >
          <Bookmark className="size-3.5" />
          {isSaving ? "Đang lưu..." : isSaved ? "Đã lưu" : "Lưu"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onOpenDetail}
          className="flex-1 gap-[7px] rounded-[12px] text-[13px]"
        >
          <PanelRight className="size-3.5" />
          Xem chi tiết
        </Button>
      </div>
    </div>
  );
}
