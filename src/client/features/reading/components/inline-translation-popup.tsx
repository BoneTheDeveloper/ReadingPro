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
import { Languages } from "lucide-react";
import { useMemo, useEffect } from "react";

import { Button } from "@/client/components/ui/button";
import type { WordSelectionAnchor } from "../lib/word-selection";

interface InlineTranslationPopupProps {
  anchor: WordSelectionAnchor | null;
  /** Sends the selected word to the Studio "Tra từ" view. */
  onTranslate: () => void;
  onClose: () => void;
}

/**
 * The "Dịch" button next to a selected word. The meaning itself opens in the
 * Studio panel, where the user also chooses whether to ask for the AI meaning.
 */
export function InlineTranslationPopup({ anchor, onTranslate, onClose }: InlineTranslationPopupProps) {
  const isOpen = anchor !== null;

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

  const dismiss = useDismiss(floatingContext, { enabled: isOpen });
  const role = useRole(floatingContext, { role: "tooltip" });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!anchor) return null;

  return (
    <FloatingPortal>
      <div
        // eslint-disable-next-line react-hooks/refs
        ref={setFloating}
        style={floatingStyles}
        className="z-50"
        {...getFloatingProps()}
      >
        <Button
          type="button"
          size="xs"
          onClick={onTranslate}
          aria-label={`Dịch từ ${anchor.word}`}
          // before: pseudo-element extends the tap area to 44px without changing the pill's visual size
          className="relative gap-1.5 rounded-full px-3 before:absolute before:-inset-2 before:content-['']"
        >
          <Languages />
          Dịch
        </Button>
      </div>
    </FloatingPortal>
  );
}
