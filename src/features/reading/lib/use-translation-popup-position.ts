"use client";

import { useEffect, useMemo } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
  type VirtualElement,
} from "@floating-ui/react";

import type { TranslationSelection } from "@/features/reading/schemas/translation";

interface UseTranslationPopupPositionInput {
  /** Selection whose bounding rect anchors the popup. */
  selection: TranslationSelection;
  /** Floating UI placement. Defaults to "top" — flips to "bottom" automatically. */
  placement?: Placement;
  /** Gap between selection and popup (px). */
  offsetPx?: number;
  /** Fixed popup width (px). The popup never shrinks to the selection width. */
  widthPx: number;
}

interface UseTranslationPopupPositionResult {
  /** Attach to the floating element (popup). */
  setFloating: (node: HTMLElement | null) => void;
  /** Apply to the floating element's style attribute. */
  floatingStyles: React.CSSProperties;
  /** Floating UI's resolved placement after flip/shift. */
  resolvedPlacement: Placement;
}

/**
 * Anchors a popup to a text selection using Floating UI.
 *
 * The selection rect is not a DOM element, so we wrap it in a `VirtualElement`
 * whose `getBoundingClientRect()` returns the selection geometry. This leaves
 * the page DOM untouched — no hidden span, no layout shift — and lets Floating
 * UI handle above/below flip, viewport shift, and scroll/resize updates
 * automatically.
 *
 * Width is fixed at `widthPx` regardless of selection width so a one-character
 * selection does not collapse the popup.
 */
export function useTranslationPopupPosition({
  selection,
  placement = "top",
  offsetPx = 8,
  widthPx,
}: UseTranslationPopupPositionInput): UseTranslationPopupPositionResult {
  // Re-create the virtual element whenever the rect identity changes. The
  // object identity is what Floating UI keys off to recompute placement, so
  // we want a stable reference within a single selection.
  const anchor = useMemo<VirtualElement>(
    () => ({
      getBoundingClientRect() {
        const r = selection.selectionRect;
        return {
          top: r.top,
          left: r.left,
          right: r.left + r.width,
          bottom: r.top + r.height,
          width: r.width,
          height: r.height,
          x: r.left,
          y: r.top,
          toJSON: () => ({}),
        };
      },
    }),
    [selection.selectionRect],
  );

  const { refs, floatingStyles, placement: resolvedPlacement, update } =
    useFloating({
      placement,
      strategy: "fixed",
      middleware: [offset(offsetPx), flip({ padding: 8 }), shift({ padding: 8 })],
    });

  // Register the virtual anchor on every render. `setReference` accepts
  // `Element | VirtualElement | null`, so a plain object works.
  useEffect(() => {
    refs.setReference(anchor);
  }, [anchor, refs]);

  // Keep the floating popup anchored to the selection while it is mounted.
  // autoUpdate re-runs on scroll / resize and re-derives placement.
  useEffect(() => {
    const floatingEl = refs.floating.current;
    if (!floatingEl) return;
    return autoUpdate(anchor, floatingEl, update, {
      // Avoid `animationFrame` — we want predictable, immediate updates.
      animationFrame: false,
    });
  }, [anchor, refs.floating, update, selection.selectedText]);

  return {
    setFloating: refs.setFloating,
    floatingStyles: { ...floatingStyles, width: widthPx },
    resolvedPlacement,
  };
}