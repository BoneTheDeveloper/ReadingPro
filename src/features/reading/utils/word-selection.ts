export type WordSelectionAnchor = {
  range: Range;
  word: string;
  context: string;
};

const EDGE_PUNCTUATION_REGEX = /^[.,;:!?()"'\`\-/\\\\]+|[.,;:!?()"'\`\-/\\\\]+$/g;
const LATIN_WORD = /^[A-Za-z][A-Za-z'-]*$/;
const CONTEXT_WORD_RADIUS = 20;
const CONTEXT_WINDOW_WORDS = CONTEXT_WORD_RADIUS * 2 + 1;

function normalizeToken(raw: string): string | null {
  const trimmed = raw
    .replace(EDGE_PUNCTUATION_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

  if (trimmed.length < 2 || trimmed.includes(" ") || !LATIN_WORD.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function extractSentence(range: Range): string | null {
  const paragraph = range.startContainer.parentElement?.closest("p");
  if (!paragraph || !paragraph.textContent) return null;

  let offset = 0;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node === range.startContainer) {
      offset += range.startOffset;
      break;
    }
    offset += node.nodeValue?.length ?? 0;
  }

  const sentences = paragraph.textContent.split(/(?<=[.!?])\s+/);
  let cursor = 0;

  for (const sentence of sentences) {
    const end = cursor + sentence.length;
    if (offset >= cursor && offset <= end) {
      const leadingSpace = sentence.length - sentence.trimStart().length;
      return clampToWordWindow(sentence.trim(), offset - cursor - leadingSpace) || null;
    }
    cursor = end + 1;
  }
  return null;
}
function clampToWordWindow(sentence: string, offsetInSentence: number): string {
  const words = [...sentence.matchAll(/\S+/g)];
  if (words.length <= CONTEXT_WINDOW_WORDS) return sentence;

  const hit = words.findIndex((w) => offsetInSentence <= (w.index ?? 0) + w[0].length);
  const center = hit === -1 ? words.length - 1 : hit;
  const start = Math.min(
    Math.max(0, center - CONTEXT_WORD_RADIUS),
    words.length - CONTEXT_WINDOW_WORDS,
  );

  return words
    .slice(start, start + CONTEXT_WINDOW_WORDS)
    .map((w) => w[0])
    .join(" ");
}

function isSingleLineSelectionInPassage(range: Range, root: Element): boolean {
  return root.contains(range.commonAncestorContainer) && !range.toString().includes("\n");
}

export function validateWordSelection(
  selection: Selection | null,
  passageRoot: Element | null,
): WordSelectionAnchor | null {
  if (!selection?.rangeCount || selection.isCollapsed || !passageRoot) return null;

  const range = selection.getRangeAt(0);
  const raw = selection.toString();

  if (!raw || !isSingleLineSelectionInPassage(range, passageRoot)) return null;

  const word = normalizeToken(raw);
  if (!word) return null;

  const { width, height } = range.getBoundingClientRect();
  if (width === 0 && height === 0) return null;

  return {
    range,
    word,
    context: extractSentence(range) ?? word,
  };
}
