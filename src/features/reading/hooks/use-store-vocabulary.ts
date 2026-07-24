import { useCallback, useState } from "react";
import { saveVocabularyAction } from "@/features/vocabulary/server/actions/vocabulary";
import type { TranslationSelection, TranslationDto } from "@/features/reading/schemas/translation";

export function useVocabulary(
  selectedWordInfo: TranslationSelection | null,
  translationData: TranslationDto | null
) {
  const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(new Set());

  const handleSaveVocabulary = useCallback(async () => {
    if (!selectedWordInfo || !translationData) return;

    try {
      await saveVocabularyAction({
        source: "TRANSLATE",
        sourceId: selectedWordInfo.sourceId,
        selectedText: selectedWordInfo.selectedText,
        translation: translationData.translation,
        contextSentence: selectedWordInfo.contextSentence,
        sourceLanguage: "en",
        targetLanguage: "vi",
      });
      
      setSavedVocabularyIds((prev) => {
        const key = JSON.stringify({
          sourceId: selectedWordInfo.sourceId,
          selectedText: selectedWordInfo.selectedText,
          contextSentence: selectedWordInfo.contextSentence,
          targetLanguage: selectedWordInfo.targetLanguage,
        });
        return new Set(prev).add(key);
      });
    } catch {
      // Xử lý lỗi ngầm
    }
  }, [selectedWordInfo, translationData]);

  const vocabularySaveKey = selectedWordInfo
    ? JSON.stringify({
        sourceId: selectedWordInfo.sourceId,
        selectedText: selectedWordInfo.selectedText,
        contextSentence: selectedWordInfo.contextSentence,
        targetLanguage: selectedWordInfo.targetLanguage,
      })
    : null;
    
  const isVocabularySaved = vocabularySaveKey ? savedVocabularyIds.has(vocabularySaveKey) : false;

  return { savedVocabularyIds, isVocabularySaved, handleSaveVocabulary };
}