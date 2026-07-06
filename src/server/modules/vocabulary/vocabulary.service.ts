import "server-only";
import { createModuleLogger } from "@/server/observability/logger";
import {
  findOwnedTranslationSource,
  saveVocabularyItemRow,
} from "./vocabulary.repository";

const log = createModuleLogger("lib:vocabulary-service");

export class VocabularyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VocabularyServiceError";
  }
}

export interface SaveVocabularyItemInput {
  userId: string;
  selectedText: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceId?: string;
  contextSentence?: string;
  source?: "TRANSLATE" | "DICTIONARY";
  dictionaryEntryId?: string;
  dictionarySenseId?: string;
}

export async function saveVocabularyItem(input: SaveVocabularyItemInput) {
  if (input.source === "TRANSLATE" && input.sourceId) {
    const passage = await findOwnedTranslationSource(
      input.userId,
      input.sourceId,
    );

    if (!passage) {
      throw new VocabularyServiceError("Source not found.");
    }
  }

  const item = await saveVocabularyItemRow(input);

  log.info(
    {
      context: {
        vocabularyItemId: item.id,
        selectedTextLength: input.selectedText.length,
      },
    },
    "Vocabulary item saved",
  );

  return item;
}
