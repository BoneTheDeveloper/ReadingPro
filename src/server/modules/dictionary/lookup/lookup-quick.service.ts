// Placeholder - actual implementation moved to features/dictionary/services/
// This file exists for backward compatibility during migration
export interface QuickTranslationInput {
  text: string;
  context: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface QuickTranslation {
  translation: string;
  source: string;
}

export async function resolveQuickDictionaryTranslation(
  input: QuickTranslationInput
): Promise<QuickTranslation | null> {
  // This function was moved - actual implementation is in features/dictionary/
  // For now return null to avoid breaking the build
  console.warn("resolveQuickDictionaryTranslation not yet migrated to feature");
  return null;
}
