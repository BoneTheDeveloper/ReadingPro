import 'server-only';
import { findEntryByIdRaw } from "./entry-detail.repository";
import { buildEntryDto } from "@/server/modules/dictionary/shared/dictionary-dto-builders";
import { RUNTIME_STATUSES } from "@/contracts/dictionary/dictionary-dtos";
import { groupLookupRows } from "../lookup/lookup.service";

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
