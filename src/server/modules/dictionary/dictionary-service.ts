import { pool, type Queryable } from "@/server/lib/db";
import type { MatchedDictionaryEntry } from "@/shared/dictionary/schema";
import { findEntries } from "./dictionary-repository";
import { baseForms, surfaceForms } from "./lookup-forms";

/**
 * Finds the dictionary entries for a selected word without AI, in one query.
 * Returns at most two: the word's own entry ("running"), then its base form
 * ("run") marked as `lemma`. Neither hides the other, so "interesting" keeps
 * its own entry and "went" still reaches "go". Empty when nothing matches.
 */
export async function resolveEntries(word: string, db: Queryable = pool): Promise<MatchedDictionaryEntry[]> {
  const surfaces = surfaceForms(word);
  const bases = baseForms(surfaces[surfaces.length - 1]);
  const found = new Map(
    (await findEntries([...new Set([...surfaces, ...bases])], db)).map((entry) => [entry.headword, entry]),
  );

  const result: MatchedDictionaryEntry[] = [];
  const surface = surfaces.map((form) => found.get(form)).find(Boolean);
  if (surface) result.push({ ...surface, match: "surface" });

  const base = bases.find((form) => form !== surface?.headword && !surfaces.includes(form) && found.has(form));
  if (base) result.push({ ...found.get(base)!, match: "lemma" });

  return result;
}
