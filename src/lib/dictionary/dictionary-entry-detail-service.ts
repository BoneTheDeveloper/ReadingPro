import { findEntryById } from "./dictionary-entry-detail-repository";
import { buildEntryDto } from "./dictionary-entry-dto-builder";
import { RUNTIME_STATUSES } from "./dictionary-dtos";

export interface EntryDetailOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

export async function getDictionaryEntryDetail(
  entryId: string,
  options: EntryDetailOptions,
) {
  const entry = await findEntryById(entryId, options.sourceLanguage, options.targetLanguage);
  if (!entry) return null;

  return buildEntryDto(entry, options.targetLanguage, RUNTIME_STATUSES);
}
