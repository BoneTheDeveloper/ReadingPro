import "server-only";
import { findEntryByIdRaw } from "../db/entry-detail-repository";
import { buildEntryDto } from "../dictionary.schema";
import { RUNTIME_STATUSES } from "../lib/dictionary-helpers";
import { groupLookupRows } from "./lookup-service";

export interface EntryDetailOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

export async function getDictionaryEntryDetail(
  entryId: string,
  options: EntryDetailOptions,
) {
  const rows = await findEntryByIdRaw(
    entryId,
    options.sourceLanguage,
    options.targetLanguage,
  );
  if (rows.length === 0) return null;

  const entry = groupLookupRows(rows);
  return buildEntryDto(entry, options.targetLanguage, RUNTIME_STATUSES);
}
