import "server-only";
import * as Sentry from "@sentry/nextjs";
import { upsertVocabularyItem } from "@/server/db/vocabulary/vocabulary-queries";
import { getOwnedTranslationSource } from "@/server/db/translation-queries";
import type { SaveVocabularyItemInput } from "./vocabulary.service";

export async function findOwnedTranslationSource(
  userId: string,
  sourceId: string,
) {
  return Sentry.startSpan(
    {
      name: "db:vocabulary-source-fetch",
      op: "db",
      attributes: {
        "db.operation": "findUnique",
        "db.model": "Passage",
        "translation.source_id": sourceId,
        "user.id": userId,
      },
    },
    () => getOwnedTranslationSource(userId, sourceId),
  );
}

export async function saveVocabularyItemRow(input: SaveVocabularyItemInput) {
  return Sentry.startSpan(
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
}
