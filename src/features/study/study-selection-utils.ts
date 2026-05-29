import type { TranslationSelection } from "./study-types";

interface ExtractSelectionInput {
  contentRef: React.RefObject<HTMLDivElement | null>;
  sourceId: string;
  targetLanguage?: "vi";
}

/**
 * Extracts the current browser text selection and surrounding context paragraph
 * from a reading content container. Returns null if no meaningful selection exists.
 */
export function extractSelectionInfo({
  contentRef,
  sourceId,
  targetLanguage = "vi",
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

  // Get selection bounding rect for popup positioning
  const rect = range.getBoundingClientRect();

  return {
    selectedText,
    selectionRect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    contextSentence,
    sourceId,
    targetLanguage,
  };
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
