/**
 * Validates the normalized split dictionary files for structural consistency.
 * Checks: cross-file key integrity, required fields, value constraints.
 *
 * Usage:
 *   pnpm db:validate:dictionary              # validate split files
 *   pnpm db:validate:dictionary small-test   # validate fixtures/small-test.json
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type DatasetMode = "normalized" | "small-test";

function resolveArg(): DatasetMode {
  const arg = process.argv[2];
  if (!arg) return "normalized";
  if (arg === "small-test") return "small-test";
  console.error(`Unknown dataset "${arg}". Valid: small-test (no arg = normalized)`);
  process.exit(1);
}

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

interface LegacySense {
  partOfSpeech: string;
  definition: string;
  translations: { targetLanguage: string; translation: string; isPrimary: boolean; status: string }[];
}

interface LegacyEntry {
  headword: string;
  senses: LegacySense[];
}

const VALID_STATUSES = new Set(["draft", "reviewed", "approved", "deprecated"]);
const VALID_SOURCE_TYPES = new Set(["seed", "manual", "provider", "llm", "mixed"]);
const VALID_ALIAS_TYPES = new Set(["variant", "inflection", "phrase"]);

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
  }

  // Check sense→entry references
  for (const s of senses) {
    if (!entryKeys.has(s.entryKey)) errors.push(`Sense ${s.senseKey} references missing entryKey: ${s.entryKey}`);
  }

  // Check duplicate senseKeys
  const seenSenseKeys = new Set<string>();
  for (const s of senses) {
    if (seenSenseKeys.has(s.senseKey)) errors.push(`Duplicate senseKey: ${s.senseKey}`);
    seenSenseKeys.add(s.senseKey);
  }

  // Check translation→sense references and values
  const primariesBySense = new Map<string, number>();
  for (const t of translations) {
    if (!senseKeys.has(t.senseKey)) errors.push(`Translation references missing senseKey: ${t.senseKey}`);
    if (!VALID_STATUSES.has(t.status)) errors.push(`Invalid status "${t.status}" in senseKey ${t.senseKey}`);
    if (!VALID_SOURCE_TYPES.has(t.sourceType)) errors.push(`Invalid sourceType "${t.sourceType}" in senseKey ${t.senseKey}`);
    if (typeof t.rank !== "number" || t.rank < 1) errors.push(`Invalid rank ${t.rank} in senseKey ${t.senseKey}`);
    const key = `${t.senseKey}__${t.targetLanguage}`;
    if (t.isPrimary) primariesBySense.set(key, (primariesBySense.get(key) ?? 0) + 1);
  }
  for (const [key, count] of primariesBySense) {
    if (count !== 1) errors.push(`${key} has ${count} primary translations (expected 1)`);
  }

  // Check alias→entry references and values
  for (const a of aliases) {
    if (!entryKeys.has(a.entryKey)) errors.push(`Alias references missing entryKey: ${a.entryKey}`);
    if (!VALID_ALIAS_TYPES.has(a.aliasType)) errors.push(`Invalid aliasType "${a.aliasType}" for ${a.normalizedAlias}`);
  }

  if (errors.length === 0) {
    console.log(`Validation passed: ${entries.length} entries, ${senses.length} senses, ${translations.length} translations, ${aliases.length} aliases`);
    return 0;
  }

  console.error(`\nValidation failed: ${errors.length} error(s)\n`);
  for (const e of errors) console.error(`  ${e}`);
  return 1;
}

function validateLegacy(dataset: string): number {
  const fixturePath = join(process.cwd(), `prisma/data/dictionary/en-vi/${dataset}.json`);
  const raw = readFileSync(fixturePath, "utf8");
  const entries: LegacyEntry[] = JSON.parse(raw);

  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.headword) { errors.push(`[${i}] missing headword`); continue; }
    if (!Array.isArray(entry.senses) || entry.senses.length === 0) {
      errors.push(`[${i}] "${entry.headword}" must have >= 1 sense`);
      continue;
    }
    for (let s = 0; s < entry.senses.length; s++) {
      const sense = entry.senses[s];
      if (!Array.isArray(sense.translations) || sense.translations.length === 0) {
        errors.push(`[${i}] "${entry.headword}" sense[${s}] must have >= 1 translation`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`Validation passed: ${entries.length} entries, 0 errors`);
    return 0;
  }

  console.error(`\nValidation failed: ${errors.length} error(s)\n`);
  for (const e of errors) console.error(`  ${e}`);
  return 1;
}

const mode = resolveArg();
const exitCode = mode === "normalized" ? validateNormalized() : validateLegacy("fixtures/small-test");
process.exit(exitCode);
