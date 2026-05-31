/**
 * Validates a dictionary seed fixture file before seeding.
 * Uses only Node.js built-ins (no external deps).
 *
 * Usage:
 *   pnpm db:validate:dictionary                # default: common-1000
 *   pnpm db:validate:dictionary small-test     # validate small-test.json
 *   pnpm db:validate:dictionary common-1000    # validate common-1000.json
 *   pnpm db:validate:dictionary generated-50000 # validate generated-50000.json
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// --- Dataset resolution ---

const VALID_DATASETS = new Set(["small-test", "common-1000", "generated-50000", "entries"]);

function resolveDatasetArg(): string {
  const arg = process.argv[2];
  if (!arg) return "common-1000";
  if (VALID_DATASETS.has(arg)) return arg;
  console.error(`Unknown dataset "${arg}". Valid: ${[...VALID_DATASETS].join(", ")}`);
  process.exit(1);
}

// --- Types (mirror fixture shape, not Prisma models) ---

interface SeedTranslation {
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number;
  status: string;
  sourceType: string;
  sourceName: string;
}

interface SeedSense {
  partOfSpeech: string;
  definition: string;
  example?: string;
  tags?: string[];
  usageRank: number;
  translations: SeedTranslation[];
}

interface SeedAlias {
  alias: string;
  type: string;
}

interface SeedEntry {
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  aliases?: SeedAlias[];
  senses: SeedSense[];
}

// --- Validation constants ---

const VALID_STATUSES = new Set(["draft", "reviewed", "approved", "deprecated"]);
const VALID_SOURCE_TYPES = new Set(["seed", "manual", "provider", "llm", "mixed"]);
const VALID_ALIAS_TYPES = new Set(["variant", "inflection", "phrase"]);

// --- Normalization (inlined from lib, standalone script cannot use path aliases) ---

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Validation logic ---

type Err = { idx: number; hw?: string; field: string; msg: string };

function push(errors: Err[], idx: number, hw: string | undefined, field: string, msg: string) {
  errors.push({ idx, hw, field, msg });
}

function validateEntries(entries: SeedEntry[]): Err[] {
  const errors: Err[] = [];
  const headwordSet = new Map<string, number>();
  const allHwNormalized = new Set<string>();

  for (const entry of entries) allHwNormalized.add(normalizeTerm(entry.headword));

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const tag = `[${i}] "${entry.headword}"`;

    if (!entry.headword || typeof entry.headword !== "string" || entry.headword.trim().length === 0) {
      push(errors, i, undefined, "headword", `${tag} headword must be a non-empty string`);
      continue;
    }

    const nh = normalizeTerm(entry.headword);
    if (headwordSet.has(nh)) {
      push(errors, i, entry.headword, "headword", `${tag} duplicate headword (same as index ${headwordSet.get(nh)})`);
    } else {
      headwordSet.set(nh, i);
    }

    if (!Array.isArray(entry.senses) || entry.senses.length === 0) {
      push(errors, i, entry.headword, "senses", `${tag} must have at least one sense`);
      continue;
    }

    for (let s = 0; s < entry.senses.length; s++) {
      const sense = entry.senses[s];
      const st = `${tag} sense[${s}]`;

      if (!Array.isArray(sense.translations) || sense.translations.length === 0) {
        push(errors, i, entry.headword, `senses[${s}].translations`, `${st} must have at least one translation`);
        continue;
      }

      // Exactly one primary per targetLanguage
      const byLang = new Map<string, SeedTranslation[]>();
      for (const tr of sense.translations) {
        if (!byLang.has(tr.targetLanguage)) byLang.set(tr.targetLanguage, []);
        byLang.get(tr.targetLanguage)!.push(tr);
      }
      for (const [lang, trs] of byLang) {
        const pc = trs.filter((t) => t.isPrimary === true).length;
        if (pc !== 1) {
          push(errors, i, entry.headword, `senses[${s}].translations`,
            `${st} targetLanguage="${lang}" needs exactly 1 primary, found ${pc}`);
        }
      }

      for (let t = 0; t < sense.translations.length; t++) {
        const tr = sense.translations[t];
        const tt = `${st} tr[${t}]`;

        if (!VALID_STATUSES.has(tr.status)) {
          push(errors, i, entry.headword, `senses[${s}].translations[${t}].status`,
            `${tt} invalid status "${tr.status}", allowed: ${[...VALID_STATUSES].join(", ")}`);
        }
        if (!VALID_SOURCE_TYPES.has(tr.sourceType)) {
          push(errors, i, entry.headword, `senses[${s}].translations[${t}].sourceType`,
            `${tt} invalid sourceType "${tr.sourceType}", allowed: ${[...VALID_SOURCE_TYPES].join(", ")}`);
        }
        if (typeof tr.rank !== "number" || tr.rank < 1) {
          push(errors, i, entry.headword, `senses[${s}].translations[${t}].rank`,
            `${tt} rank must be >= 1, got ${tr.rank}`);
        }
      }
    }

    if (Array.isArray(entry.aliases)) {
      for (let a = 0; a < entry.aliases.length; a++) {
        const alias = entry.aliases[a];
        const at = `${tag} alias[${a}]`;

        if (!VALID_ALIAS_TYPES.has(alias.type)) {
          push(errors, i, entry.headword, `aliases[${a}].type`,
            `${at} invalid type "${alias.type}", allowed: ${[...VALID_ALIAS_TYPES].join(", ")}`);
        }
        const na = normalizeTerm(alias.alias);
        if (na !== nh && allHwNormalized.has(na)) {
          push(errors, i, entry.headword, `aliases[${a}].alias`,
            `${at} "${alias.alias}" collides with another entry headword`);
        }
      }
    }
  }

  return errors;
}

// --- Main ---

function main() {
  const dataset = resolveDatasetArg();
  const fixturePath = join(process.cwd(), `prisma/data/dictionary/en-vi/${dataset}.json`);

  console.log(`Validating: ${fixturePath}`);

  let raw: string;
  try {
    raw = readFileSync(fixturePath, "utf8");
  } catch (err) {
    console.error(`Failed to read fixture file: ${(err as Error).message}`);
    process.exit(1);
  }

  let entries: SeedEntry[];
  try {
    entries = JSON.parse(raw) as SeedEntry[];
  } catch (err) {
    console.error(`Invalid JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  const errors = validateEntries(entries);

  if (errors.length === 0) {
    console.log(`Validation passed: ${entries.length} entries, 0 errors.`);
    process.exit(0);
  }

  console.error(`\nValidation failed: ${errors.length} error(s) across ${entries.length} entries.\n`);
  for (const e of errors) {
    console.error(`  [${e.idx}] ${e.hw ?? "?"} :: ${e.field} - ${e.msg}`);
  }

  process.exit(1);
}

main();
