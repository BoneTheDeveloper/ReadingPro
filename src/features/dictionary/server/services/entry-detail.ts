import "server-only";
import { findEntryByIdRaw } from "../db/entry-detail";
import { buildEntryDto } from "../../schemas/dictionary";
import { RUNTIME_STATUSES } from "../../lib/dictionary-helpers";
import { groupLookupRows } from "./lookup";

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
