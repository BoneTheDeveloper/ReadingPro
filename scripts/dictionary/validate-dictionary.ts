/**
 * Validates the normalized split dictionary files for structural consistency.
 * Checks: cross-file key integrity, required fields, value constraints,
 * parent-child coverage, and database-unique key uniqueness.
 *
 * Usage:
 *   pnpm db:validate:dictionary
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeDictionaryTerm } from "../../src/contracts/dictionary/normalize-dictionary-term";

interface NormalizedEntry {
  entryKey: string;
  headword: string;
  normalizedHeadword: string;
  sourceLanguage: string;
  frequencyRank: number;
}

interface NormalizedSense {
  senseKey: string;
  entryKey: string;
  partOfSpeech: string | null;
  definition: string | null;
  example: string | null;
  tags: string[];
  usageRank: number;
}

interface NormalizedTranslation {
  senseKey: string;
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number;
  status: string;
  sourceType: string;
  sourceName: string | null;
}

interface NormalizedAlias {
  entryKey: string;
  alias: string;
  normalizedAlias: string;
  aliasType: string;
}

const VALID_STATUSES = new Set(["draft", "reviewed", "approved", "deprecated"]);
const VALID_SOURCE_TYPES = new Set(["seed", "manual", "provider", "llm", "mixed"]);
const VALID_ALIAS_TYPES = new Set(["variant", "inflection", "phrase"]);
const SUPPORTED_SOURCE_LANGUAGE = "en";
const SUPPORTED_TARGET_LANGUAGE = "vi";
const VALID_NORMALIZED_SEED_SOURCE_NAMES = new Set(["seed-common-1000"]);

function isPositiveInteger(value: unknown) {
  return Number.isInteger(value) && typeof value === "number" && value >= 1;
}

function isConfidence(value: unknown) {
  return typeof value === "number" && value >= 0 && value <= 1;
}

function validateNormalized(): number {
  const baseDir = join(process.cwd(), "prisma/data/dictionary/en-vi");
  const entries: NormalizedEntry[] = JSON.parse(readFileSync(join(baseDir, "entries.json"), "utf8"));
  const senses: NormalizedSense[] = JSON.parse(readFileSync(join(baseDir, "senses.json"), "utf8"));
  const translations: NormalizedTranslation[] = JSON.parse(readFileSync(join(baseDir, "translations.json"), "utf8"));
  const aliases: NormalizedAlias[] = JSON.parse(readFileSync(join(baseDir, "aliases.json"), "utf8"));

  const errors: string[] = [];
  const entryKeys = new Set(entries.map((e) => e.entryKey));
  const senseKeys = new Set(senses.map((s) => s.senseKey));

  // Check for duplicate entryKeys
  const seenEntryKeys = new Set<string>();
  for (const e of entries) {
    if (seenEntryKeys.has(e.entryKey)) errors.push(`Duplicate entryKey: ${e.entryKey}`);
    seenEntryKeys.add(e.entryKey);
    if (!e.headword) errors.push(`Entry missing headword: ${e.entryKey}`);
    if (e.sourceLanguage !== SUPPORTED_SOURCE_LANGUAGE) {
      errors.push(`Entry "${e.headword}" (${e.entryKey}) has unsupported sourceLanguage "${e.sourceLanguage}"`);
    }
    if (!isPositiveInteger(e.frequencyRank)) {
      errors.push(`Entry "${e.headword}" (${e.entryKey}) has invalid frequencyRank ${e.frequencyRank}`);
    }

    const normalizedHeadword = normalizeDictionaryTerm(e.headword);
    if (e.normalizedHeadword !== normalizedHeadword) {
      errors.push(`Entry "${e.headword}" normalizedHeadword "${e.normalizedHeadword}" does not match "${normalizedHeadword}"`);
    }
    if (e.entryKey !== normalizedHeadword) {
      errors.push(`Entry "${e.headword}" entryKey "${e.entryKey}" does not match normalized headword "${normalizedHeadword}"`);
    }
  }

  // Check (normalizedHeadword, sourceLanguage) uniqueness — mirrors the DB unique constraint
  const seenDbUnique = new Set<string>();
  for (const e of entries) {
    const dbKey = `${e.normalizedHeadword}__${e.sourceLanguage}`;
    if (seenDbUnique.has(dbKey)) {
      errors.push(`Duplicate DB unique key (normalizedHeadword, sourceLanguage): "${e.normalizedHeadword}" / "${e.sourceLanguage}"`);
    }
    seenDbUnique.add(dbKey);
  }

  // Check sense→entry references
  for (const s of senses) {
    if (!entryKeys.has(s.entryKey)) errors.push(`Sense ${s.senseKey} references missing entryKey: ${s.entryKey}`);
    if (!s.senseKey) errors.push(`Sense for entryKey ${s.entryKey} is missing senseKey`);
    if (!isPositiveInteger(s.usageRank)) {
      errors.push(`Sense ${s.senseKey} has invalid usageRank ${s.usageRank}`);
    }
    if (!Array.isArray(s.tags) || s.tags.some((tag) => typeof tag !== "string")) {
      errors.push(`Sense ${s.senseKey} has invalid tags`);
    }
  }

  // Check duplicate senseKeys
  const seenSenseKeys = new Set<string>();
  for (const s of senses) {
    if (seenSenseKeys.has(s.senseKey)) errors.push(`Duplicate senseKey: ${s.senseKey}`);
    seenSenseKeys.add(s.senseKey);
  }

  // Check that every entry has at least one sense
  const entriesWithSenses = new Set(senses.map((s) => s.entryKey));
  for (const e of entries) {
    if (!entriesWithSenses.has(e.entryKey)) {
      errors.push(`Entry "${e.headword}" (${e.entryKey}) has no senses`);
    }
  }

  // Check that every sense has at least one translation
  const sensesWithTranslations = new Set(translations.map((t) => t.senseKey));
  for (const s of senses) {
    if (!sensesWithTranslations.has(s.senseKey)) {
      errors.push(`Sense ${s.senseKey} (entryKey: ${s.entryKey}) has no translations`);
    }
  }

  // Check translation→sense references, values, and primary counts
  const groupsBySenseLang = new Map<string, { total: number; primaries: number; ranks: Set<number>; primaryRanks: number[] }>();
  for (const t of translations) {
    if (!senseKeys.has(t.senseKey)) errors.push(`Translation references missing senseKey: ${t.senseKey}`);
    if (t.targetLanguage !== SUPPORTED_TARGET_LANGUAGE) {
      errors.push(`Translation for senseKey ${t.senseKey} has unsupported targetLanguage "${t.targetLanguage}"`);
    }
    if (!t.translation) errors.push(`Translation for senseKey ${t.senseKey} is missing translation text`);
    if (!VALID_STATUSES.has(t.status)) errors.push(`Invalid status "${t.status}" in senseKey ${t.senseKey}`);
    if (!VALID_SOURCE_TYPES.has(t.sourceType)) errors.push(`Invalid sourceType "${t.sourceType}" in senseKey ${t.senseKey}`);
    if (t.sourceType === "seed" && !VALID_NORMALIZED_SEED_SOURCE_NAMES.has(t.sourceName ?? "")) {
      errors.push(`Invalid seed sourceName "${t.sourceName ?? "null"}" in senseKey ${t.senseKey}`);
    }
    if (!isPositiveInteger(t.rank)) errors.push(`Invalid rank ${t.rank} in senseKey ${t.senseKey}`);
    if (!isConfidence(t.confidence)) errors.push(`Invalid confidence ${t.confidence} in senseKey ${t.senseKey}`);

    const key = `${t.senseKey}__${t.targetLanguage}`;
    const group = groupsBySenseLang.get(key) ?? { total: 0, primaries: 0, ranks: new Set<number>(), primaryRanks: [] };
    group.total++;
    if (t.isPrimary) group.primaries++;
    if (t.isPrimary) group.primaryRanks.push(t.rank);
    if (group.ranks.has(t.rank)) {
      errors.push(`${key} has duplicate translation rank ${t.rank}`);
    }
    group.ranks.add(t.rank);
    groupsBySenseLang.set(key, group);
  }

  for (const [key, { total, primaries, primaryRanks }] of groupsBySenseLang) {
    if (primaries !== 1) {
      errors.push(`${key} has ${primaries} primary translations out of ${total} (expected exactly 1)`);
    }
    if (primaryRanks.length === 1 && primaryRanks[0] !== 1) {
      errors.push(`${key} primary translation rank is ${primaryRanks[0]} (expected 1)`);
    }
  }

  // Check alias→entry references and values
  const seenAliasesByEntry = new Set<string>();
  for (const a of aliases) {
    if (!entryKeys.has(a.entryKey)) errors.push(`Alias references missing entryKey: ${a.entryKey}`);
    if (!a.alias) errors.push(`Alias for entryKey ${a.entryKey} is missing alias text`);
    if (!VALID_ALIAS_TYPES.has(a.aliasType)) errors.push(`Invalid aliasType "${a.aliasType}" for ${a.normalizedAlias}`);
    const normalizedAlias = normalizeDictionaryTerm(a.alias);
    if (a.normalizedAlias !== normalizedAlias) {
      errors.push(`Alias "${a.alias}" normalizedAlias "${a.normalizedAlias}" does not match "${normalizedAlias}"`);
    }

    const aliasKey = `${a.entryKey}__${a.normalizedAlias}`;
    if (seenAliasesByEntry.has(aliasKey)) {
      errors.push(`Duplicate alias for entryKey ${a.entryKey}: ${a.normalizedAlias}`);
    }
    seenAliasesByEntry.add(aliasKey);
  }

  if (errors.length === 0) {
    console.log(`Validation passed: ${entries.length} entries, ${senses.length} senses, ${translations.length} translations, ${aliases.length} aliases`);
    return 0;
  }

  console.error(`\nValidation failed: ${errors.length} error(s)\n`);
  for (const e of errors) console.error(`  ${e}`);
  return 1;
}

process.exit(validateNormalized());
