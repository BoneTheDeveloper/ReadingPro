export function normalizeDictionaryTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDictionaryKey(input: {
  normalizedTerm: string;
  sourceLanguage: string;
  targetLanguage: string;
}): string {
  return `${input.sourceLanguage}:${input.targetLanguage}:${input.normalizedTerm}`;
}
