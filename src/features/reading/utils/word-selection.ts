export type WordSelection = {
  selectedText: string;
  contextSentence: string;
  sourceId: string;
  targetLanguage: "vi";
};

export type WordSelectionAnchor = {
  selection: WordSelection;
  range: Range;
  rect: DOMRect;
};

const EDGE_PUNCTUATION = ".,;:!?()\"'`-/\\";

const LATIN_WORD = /^[A-Za-z][A-Za-z'-]*$/;

/**
 * Trim a small ASCII punctuation set and collapse internal whitespace. Returns
 * the normalized token or `null` when the result is empty / too short / not a
 * single word.
 */
function normalizeToken(raw: string): string | null {
  let start = 0;
  let end = raw.length;
  while (start < end && EDGE_PUNCTUATION.includes(raw[start] ?? "")) {
    start += 1;
  }
  while (end > start && EDGE_PUNCTUATION.includes(raw[end - 1] ?? "")) {
    end -= 1;
  }
  const trimmed = raw.slice(start, end).replace(/\s+/g, " ").trim();
  if (trimmed.length < 2) {
    return null;
  }
  if (trimmed.includes(" ")) {
    return null;
  }
  if (!LATIN_WORD.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Walk up the DOM looking for a `<p>` ancestor. Used for sentence context only;
 * we deliberately allow the passage root to be a `<div>` (the current layout
 * splits paragraphs with `\n\n` inside a single container).
 */
function extractParagraph(range: Range): string | null {
  let node: Node | null = range.startContainer;
  while (node && node.nodeType !== Node.ELEMENT_NODE) {
    node = node.parentNode;
  }
  let element: Element | null = node as Element | null;
  while (element) {
    if (element.tagName === "P") {
      const text = (element.textContent ?? "").trim();
      return text.length > 0 ? text : null;
    }
    element = element.parentElement;
  }
  return null;
}

/**
 * Confirm the selection range lives entirely inside the provided passage root.
 * Returns `false` if the selection spans multiple containers or escapes the root.
 */
function rangeIsInside(range: Range, root: Element): boolean {
  const startNode = range.startContainer.parentNode;
  const endNode = range.endContainer.parentNode;
  if (!startNode || !endNode) return false;
  if (!root.contains(startNode) || !root.contains(endNode)) {
    return false;
  }
  // A multi-paragraph selection splits inside the passage root. We only want a
  // single lexical token, so reject any selection that crosses block boundaries.
  if (range.toString().includes("\n")) {
    return false;
  }
  return true;
}

/**
 * Convert a browser selection into a `WordSelectionAnchor`. Returns `null` for
 * any invalid scenario: missing selection, collapsed range, multi-word, or
 * selection outside the passage container.
 */
export function selectionToWordSelection(
  selection: Selection | null,
  passageRoot: Element | null,
  sourceId: string,
): WordSelectionAnchor | null {
  if (!selection || !passageRoot) return null;
  if (selection.rangeCount === 0 || selection.isCollapsed) return null;

  const raw = selection.toString();
  if (raw.length === 0) return null;

  const normalized = normalizeToken(raw);
  if (!normalized) return null;

  const range = selection.getRangeAt(0);
  if (!rangeIsInside(range, passageRoot)) return null;

  const context = extractParagraph(range) ?? raw.trim();
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return {
    range,
    rect,
    selection: {
      selectedText: normalized,
      contextSentence: context,
      sourceId,
      targetLanguage: "vi",
    },
  };
}
