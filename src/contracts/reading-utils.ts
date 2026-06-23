

export interface WordDefinition {
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
}

export interface HighlightedWord {
  word: string;
  startIndex: number;
  endIndex: number;
  definition?: WordDefinition;
}

export function identifyChallengingWords(
  text: string,
  level: string
): HighlightedWord[] {
  const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  ]);

  const threshold: Record<string, number> = {
    A1: 8,
    A2: 7,
    B1: 6,
    B2: 5,
    C1: 4,
    C2: 0,
  };

  const minLength = threshold[level] ?? 6;
  if (minLength === 0) return [];

  const words: HighlightedWord[] = [];
  const regex = /\b[a-zA-Z]{4,}\b/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const lowerWord = word.toLowerCase();

    if (!commonWords.has(lowerWord) && word.length >= minLength) {
      words.push({
        word: lowerWord,
        startIndex: match.index,
        endIndex: match.index + word.length,
      });
    }
  }

  return words;
}

export function parsePassageForDisplay(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs;
}