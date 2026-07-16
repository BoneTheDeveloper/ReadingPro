import "server-only";
import type { LookupRawRow } from "../db/lookup";

export function groupLookupRows(rows: LookupRawRow[]) {
  const first = rows[0];
  const senseMap = new Map<
    string,
    {
      id: string;
      partOfSpeech: string | null;
      definition: string | null;
      example: string | null;
      tags: string[] | null;
      usageRank: number;
      translations: Array<{
        id: string;
        senseId: string;
        targetLanguage: string;
        translation: string;
        isPrimary: boolean;
        rank: number;
        confidence: number | null;
        status: string;
        sourceType: string;
        sourceName: string | null;
        reviewedAt: Date | null;
      }>;
    }
  >();

  for (const row of rows) {
    let sense = senseMap.get(row.senseId);
    if (!sense) {
      sense = {
        id: row.senseId,
        partOfSpeech: row.partOfSpeech,
        definition: row.definition,
        example: row.example,
        tags: row.tags,
        usageRank: row.usageRank,
        translations: [],
      };
      senseMap.set(row.senseId, sense);
    }

    if (row.translationId) {
      sense.translations.push({
        id: row.translationId,
        senseId: row.translationSenseId!,
        targetLanguage: row.targetLanguage!,
        translation: row.translation!,
        isPrimary: row.isPrimary!,
        rank: row.rank!,
        confidence: row.confidence,
        status: row.status!,
        sourceType: row.sourceType!,
        sourceName: row.sourceName,
        reviewedAt: row.reviewedAt,
      });
    }
  }

  return {
    id: first.entryId,
    headword: first.headword,
    sourceLanguage: first.sourceLanguage,
    frequencyRank: first.frequencyRank,
    senses: Array.from(senseMap.values()),
  };
}
