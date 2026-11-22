import { AppError } from "@/server/lib/errors";
import { resolveEntries } from "@/server/modules/dictionary";
import { requireOwnedPassage } from "@/server/modules/passage";
import type { WordLookup, WordLookupInput, WordLookupResult } from "@/shared/dictionary/schema";
import { deleteLookup, findLookup, listLookups, upsertLookup } from "./word-lookup-repository";

/**
 * Looks a selected word up in the dictionary and records it in the passage's
 * history. A word the dictionary does not know is reported and not recorded.
 */
export async function lookUpWordForUser(userId: string, input: WordLookupInput): Promise<WordLookupResult> {
  await requireOwnedPassage(userId, input.passageId);

  const entries = await resolveEntries(input.word);
  if (entries.length === 0) {
    throw new AppError("dictionary.not_found", "Word not in the dictionary", { word: input.word });
  }

  const lookup = await upsertLookup({
    userId,
    passageId: input.passageId,
    headword: entries[0].headword,
    selectedText: input.word,
    contextSentence: input.context ?? null,
  });
  return { lookup, entries };
}

export async function listLookupsForUser(userId: string, passageId: string): Promise<WordLookup[]> {
  await requireOwnedPassage(userId, passageId);
  return listLookups(userId, passageId);
}

/** A stored lookup with its entries resolved again; `entries` is empty after a reimport dropped the word. */
export async function getLookupForUser(userId: string, id: string): Promise<WordLookupResult> {
  const lookup = await findLookup(userId, id);
  if (!lookup) throw new AppError("word_lookup.not_found", "Word lookup not found", { id });
  return { lookup, entries: await resolveEntries(lookup.selectedText) };
}

export async function deleteLookupForUser(userId: string, id: string): Promise<void> {
  if (!(await deleteLookup(userId, id))) {
    throw new AppError("word_lookup.not_found", "Word lookup not found", { id });
  }
}
