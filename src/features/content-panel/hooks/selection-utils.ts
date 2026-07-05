import type { TranslationSelection } from "@/features/study/shared/types";
import { countWords } from "@/contracts/translation/text-utils";

type SelectionRect = TranslationSelection["selectionRect"];
type SelectionPoint = { x: number; y: number };

const CURSOR_SELECTION_ANCHOR_TOLERANCE = 48;

interface ExtractSelectionInput {
  contentRef: React.RefObject<HTMLDivElement | null>;
  sourceId: string;
  targetLanguage?: "vi";
  cursorPoint?: SelectionPoint;
}

/**
 * Extracts the current browser text selection and surrounding context paragraph
 * from a reading content container. Returns null if no meaningful selection exists.
 */
export function extractSelectionInfo({
  contentRef,
  sourceId,
  targetLanguage = "vi",
  cursorPoint,
}: ExtractSelectionInput): TranslationSelection | null {
  const container = contentRef.current;
  if (!container) return null;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;

  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const range = selection.getRangeAt(0);
  if (!range) return null;

  // Verify selection is inside our content container
  if (!container.contains(range.commonAncestorContainer)) return null;

  // Find closest <p> ancestor for context sentence
  const contextSentence = extractContextParagraph(range);

  // Get selection geometry for popup positioning.
  const clientRects = getVisibleSelectionRects(range);
  const rect = getSelectionBoundingRect(range, clientRects);
  if (!isVisibleSelectionRect(rect)) return null;

  return {
    selectedText,
    selectionRect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    actionRect: calculateSelectionActionRect({
      selectionRect: rect,
      clientRects,
      isBackward: isSelectionBackward(selection),
      cursorPoint,
    }),
    contextSentence,
    sourceId,
    targetLanguage,
    clientMetrics: {
      wordsBeforeSelected: countWordsBeforeSelection(container, range),
    },
  };
}

export function calculateCursorActionRect(
  cursorPoint: SelectionPoint,
): SelectionRect {
  return {
    top: cursorPoint.y,
    left: cursorPoint.x,
    width: 0,
    height: 0,
  };
}

export function calculateSelectionActionRect(input: {
  selectionRect: SelectionRect;
  clientRects: SelectionRect[];
  isBackward: boolean;
  cursorPoint?: SelectionPoint;
}): SelectionRect {
  const visibleRects = input.clientRects.filter(isVisibleSelectionRect);

  if (
    input.cursorPoint &&
    isCursorPointNearSelection(
      input.cursorPoint,
      visibleRects,
      input.selectionRect,
    )
  ) {
    return calculateCursorActionRect(input.cursorPoint);
  }

  const edgeRect = input.isBackward ? visibleRects[0] : visibleRects.at(-1);

  if (!edgeRect) return input.selectionRect;

  return {
    top: edgeRect.top,
    left: input.isBackward ? edgeRect.left : edgeRect.left + edgeRect.width,
    width: 0,
    height: edgeRect.height || input.selectionRect.height,
  };
}

function isCursorPointNearSelection(
  point: SelectionPoint,
  clientRects: SelectionRect[],
  selectionRect: SelectionRect,
) {
  const rects = clientRects.length > 0 ? clientRects : [selectionRect];

  return rects.some(
    (rect) =>
      point.x >= rect.left - CURSOR_SELECTION_ANCHOR_TOLERANCE &&
      point.x <= rect.left + rect.width + CURSOR_SELECTION_ANCHOR_TOLERANCE &&
      point.y >= rect.top - CURSOR_SELECTION_ANCHOR_TOLERANCE &&
      point.y <= rect.top + rect.height + CURSOR_SELECTION_ANCHOR_TOLERANCE,
  );
}

function extractContextParagraph(range: Range): string {
  let node: Node | null = range.commonAncestorContainer;

  // Walk up to find the closest <p> element
  while (node && node.nodeType !== Node.ELEMENT_NODE) {
    node = node.parentNode;
  }

  while (node && node instanceof HTMLElement) {
    if (node.tagName === "P" && node.textContent) {
      return node.textContent.trim();
    }
    node = node.parentElement;
  }

  // Fallback: return the full container text
  const container = range.commonAncestorContainer;
  if (container.textContent) {
    return container.textContent.trim();
  }

  return "";
}

function countWordsBeforeSelection(container: HTMLElement, range: Range) {
  const beforeSelectionRange = document.createRange();
  beforeSelectionRange.setStart(container, 0);
  beforeSelectionRange.setEnd(range.startContainer, range.startOffset);

  const wordsBeforeSelection = countWords(beforeSelectionRange.toString());
  beforeSelectionRange.detach();

  return wordsBeforeSelection;
}

function getVisibleSelectionRects(range: Range): SelectionRect[] {
  return Array.from(range.getClientRects())
    .map(rectFromDOMRect)
    .filter(isVisibleSelectionRect);
}

function getSelectionBoundingRect(
  range: Range,
  clientRects: SelectionRect[],
): SelectionRect {
  const rect = rectFromDOMRect(range.getBoundingClientRect());
  if (isVisibleSelectionRect(rect)) return rect;

  if (clientRects.length === 0) return rect;

  const left = Math.min(...clientRects.map((clientRect) => clientRect.left));
  const top = Math.min(...clientRects.map((clientRect) => clientRect.top));
  const right = Math.max(
    ...clientRects.map((clientRect) => clientRect.left + clientRect.width),
  );
  const bottom = Math.max(
    ...clientRects.map((clientRect) => clientRect.top + clientRect.height),
  );

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

function rectFromDOMRect(rect: DOMRect): SelectionRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isVisibleSelectionRect(rect: SelectionRect) {
  return rect.width > 0 || rect.height > 0;
}

function isSelectionBackward(selection: Selection) {
  if (!selection.anchorNode || !selection.focusNode) return false;

  const directionRange = document.createRange();
  directionRange.setStart(selection.anchorNode, selection.anchorOffset);
  directionRange.setEnd(selection.focusNode, selection.focusOffset);

  return directionRange.collapsed;
}
