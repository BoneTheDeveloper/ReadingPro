export type WordSelectionAnchor = {
  range: Range;
  word: string;
  context: string;
};

const EDGE_PUNCTUATION = ".,;:!?()\"'`-/\\";

const LATIN_WORD = /^[A-Za-z][A-Za-z'-]*$/;

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


function extractSentence(range: Range): string | null {
  let node: Node | null = range.startContainer;
  while (node && node.nodeType !== Node.ELEMENT_NODE) {
    node = node.parentNode;
  }
  const element = node as Element | null;
  const paragraph = element?.closest("p");
  if (!paragraph) return null;
  const text = (paragraph.textContent ?? "").trim();
  if (text.length === 0) return null;
  const normalized = (range.toString() ?? "").trim();
  if (normalized.length === 0) return text;

  const startOffset = paragraph.textContent
    ? paragraph.textContent.indexOf(normalized, getOffsetInParagraph(paragraph, range))
    : -1;
  if (startOffset < 0) return text;

  const endOffset = startOffset + normalized.length;

  const sentenceStart = findSentenceStart(text, startOffset);
  const sentenceEnd = findSentenceEnd(text, endOffset);
  return text.slice(sentenceStart, sentenceEnd).trim() || null;
}

function getOffsetInParagraph(paragraph: Element, range: Range): number {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === range.startContainer) {
      return offset + range.startOffset;
    }
    offset += current.nodeValue?.length ?? 0;
    current = walker.nextNode();
  }
  return 0;
}

const SENTENCE_END = /[.!?](?=\s|$)/g;

function findSentenceStart(text: string, wordOffset: number): number {
  const before = text.slice(0, wordOffset);
  const matches = [...before.matchAll(SENTENCE_END)];
  if (matches.length === 0) return 0;
  const last = matches[matches.length - 1];
  const end = (last.index ?? 0) + last[0].length;
  return Math.min(end, wordOffset);
}

function findSentenceEnd(text: string, wordEndOffset: number): number {
  const after = text.slice(wordEndOffset);
  SENTENCE_END.lastIndex = 0;
  const match = SENTENCE_END.exec(after);
  if (!match) return text.length;
  return wordEndOffset + match.index + match[0].length;
}

function isSingleLineSelectionInPassage(range: Range, root: Element): boolean {
  if (!root.contains(range.startContainer)) return false;
  if (!root.contains(range.endContainer)) return false;
  if (range.toString().includes("\n")) return false;
  return true;
}

export function validateWordSelection(
  selection: Selection | null,
  passageRoot: Element | null,
): WordSelectionAnchor | null {
  if (!selection || !passageRoot) return null;
  if (selection.rangeCount === 0 || selection.isCollapsed) return null;

  const raw = selection.toString();
  if (raw.length === 0) return null;

  const word = normalizeToken(raw);
  if (!word) return null;

  const range = selection.getRangeAt(0);
  if (!isSingleLineSelectionInPassage(range, passageRoot)) return null;

  const context = extractSentence(range);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return {
    range,
    word,
    context: context ?? word,
  };
}
