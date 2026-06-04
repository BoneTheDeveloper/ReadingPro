/**
 * One-time migration script: splits a legacy nested JSON dictionary file
 * into normalized canonical files:
 *   entries.json, senses.json, translations.json, aliases.json
 * Each file uses stable cross-file keys (entryKey, senseKey) for joining.
 *
 * NOTE: The original input (common-1000.json) has been deleted after migration.
 * This script is kept for reference and for normalizing future legacy-format imports.
 * Provide a compatible nested JSON file as the first argument.
 *
 * Usage: npx tsx scripts/dictionary/normalize-dictionary.ts [input.json]
 * Default input: prisma/data/dictionary/en-vi/fixtures/small-test.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface RawTranslation {
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number;
  status: string;
  sourceType: string;
  sourceName: string;
}

interface RawSense {
  partOfSpeech: string;
  definition: string;
  example?: string;
  tags?: string[];
  usageRank: number;
  translations: RawTranslation[];
}

interface RawAlias {
  alias: string;
  type: string;
}

interface RawEntry {
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  aliases?: RawAlias[];
  senses: RawSense[];
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

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  const defaultInput = join(process.cwd(), "prisma/data/dictionary/en-vi/fixtures/small-test.json");
  const inputPath = process.argv[2] ? resolve(process.argv[2]) : defaultInput;
  const outputDir = join(process.cwd(), "prisma/data/dictionary/en-vi");

  const raw = readFileSync(inputPath, "utf8");
  const entries: RawEntry[] = JSON.parse(raw);

  const normalizedEntries: NormalizedEntry[] = [];
  const normalizedSenses: NormalizedSense[] = [];
  const normalizedTranslations: NormalizedTranslation[] = [];
  const normalizedAliases: NormalizedAlias[] = [];

  for (const entry of entries) {
    const entryKey = normalizeTerm(entry.headword);
    const sourceLanguage = entry.sourceLanguage ?? "en";

    normalizedEntries.push({
      entryKey,
      headword: entry.headword,
      normalizedHeadword: entryKey,
      sourceLanguage,
      frequencyRank: entry.frequencyRank,
    });

    for (let si = 0; si < entry.senses.length; si++) {
      const sense = entry.senses[si];
      const senseKey = `${entryKey}__${si}`;

      normalizedSenses.push({
        senseKey,
        entryKey,
        partOfSpeech: sense.partOfSpeech ?? null,
        definition: sense.definition ?? null,
        example: sense.example ?? null,
        tags: sense.tags ?? [],
        usageRank: sense.usageRank,
      });

      for (const tr of sense.translations) {
        normalizedTranslations.push({
          senseKey,
          targetLanguage: tr.targetLanguage,
          translation: tr.translation,
          isPrimary: tr.isPrimary,
          rank: tr.rank,
          confidence: tr.confidence,
          status: tr.status,
          sourceType: tr.sourceType,
          sourceName: tr.sourceName ?? null,
        });
      }
    }

    if (Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        normalizedAliases.push({
          entryKey,
          alias: alias.alias,
          normalizedAlias: normalizeTerm(alias.alias),
          aliasType: alias.type,
        });
      }
    }
  }

  writeFileSync(join(outputDir, "entries.json"), JSON.stringify(normalizedEntries, null, 2) + "\n");
  writeFileSync(join(outputDir, "senses.json"), JSON.stringify(normalizedSenses, null, 2) + "\n");
  writeFileSync(join(outputDir, "translations.json"), JSON.stringify(normalizedTranslations, null, 2) + "\n");
  writeFileSync(join(outputDir, "aliases.json"), JSON.stringify(normalizedAliases, null, 2) + "\n");

  console.log(`Split ${entries.length} entries into:`);
  console.log(`  entries.json:       ${normalizedEntries.length}`);
  console.log(`  senses.json:        ${normalizedSenses.length}`);
  console.log(`  translations.json:  ${normalizedTranslations.length}`);
  console.log(`  aliases.json:       ${normalizedAliases.length}`);
}

main();
