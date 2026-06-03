import { findEntryByIdRaw } from "./dictionary-entry-detail-repository";
import { buildEntryDto } from "./dictionary-entry-dto-builder";
import { RUNTIME_STATUSES } from "./dictionary-dtos";
import { groupLookupRows } from "./dictionary-lookup-service";

export interface EntryDetailOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

export async function getDictionaryEntryDetail(
  entryId: string,
  options: EntryDetailOptions,
) {
  const rows = await findEntryByIdRaw(entryId, options.sourceLanguage, options.targetLanguage);
  if (rows.length === 0) return null;

  const entry = groupLookupRows(rows);
  return buildEntryDto(entry, options.targetLanguage, RUNTIME_STATUSES);
}
