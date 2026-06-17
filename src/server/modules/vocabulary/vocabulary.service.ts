import 'server-only';
import * as Sentry from "@sentry/nextjs";
import { createModuleLogger } from "@/server/observability/logger";
import { upsertVocabularyItem } from "@/server/db/vocabulary-queries";
import { getOwnedTranslationSource } from "@/server/db/translation-queries";

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
    const passage = await Sentry.startSpan(
      {
        name: "db:vocabulary-source-fetch",
        op: "db",
        attributes: {
          "db.operation": "findUnique",
          "db.model": "Passage",
          "translation.source_id": input.sourceId,
          "user.id": input.userId,
        },
      },
      () => getOwnedTranslationSource(input.userId, input.sourceId!),
    );

    if (!passage) {
      throw new VocabularyServiceError("Source not found.");
    }
  }

  const item = await Sentry.startSpan(
    {
      name: "db:vocabulary-upsert",
      op: "db",
      attributes: {
        "db.operation": "upsert",
        "db.model": "VocabularyItem",
        "translation.selected_text_length": input.selectedText.length,
        "user.id": input.userId,
      },
    },
    () => upsertVocabularyItem(input),
  );

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
