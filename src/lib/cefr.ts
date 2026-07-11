export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const TARGET_LEVEL_MAP: Partial<Record<CEFRLevel, CEFRLevel>> = {
  C2: 'C1',
  C1: 'B2',
  B2: 'B1',
  B1: 'A2',
};

export function getCEFRLabel(level: CEFRLevel): string {
  const labels: Record<CEFRLevel, string> = {
    A1: 'Beginner',
    A2: 'Elementary',
    B1: 'Intermediate',
    B2: 'Upper Intermediate',
    C1: 'Advanced',
    C2: 'Proficient',
  };
  return labels[level];
}

export function getCEFRShortLabel(level: CEFRLevel): string {
  return level;
}

export function getTargetCEFRLevel(level: CEFRLevel): CEFRLevel | null {
  return TARGET_LEVEL_MAP[level] ?? null;
}

export function isSimplifiableCEFRLevel(level: CEFRLevel | null | undefined) {
  return Boolean(level && level !== 'A1' && level !== 'A2');
}

export function getHeuristicCEFR(text: string): CEFRLevel {
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  const longWords = words.filter((w) => w.length > 8).length;
  const longWordRatio = words.length > 0 ? longWords / words.length : 0;

  if (avgWordsPerSentence > 25 || longWordRatio > 0.2) return 'C1';
  if (avgWordsPerSentence > 20 || longWordRatio > 0.15) return 'B2';
  if (avgWordsPerSentence > 15 || longWordRatio > 0.1) return 'B1';
  if (avgWordsPerSentence > 10 || longWordRatio > 0.05) return 'A2';
  return 'A1';
}
