/**
 * Generates generated-50000.json — ~50,000 EN-VI dictionary entries for performance benchmarking.
 * Uses random generation with deterministic seed for reproducibility.
 * Output is gitignored; regenerate locally when benchmarking.
 *
 * Usage: pnpm db:generate:benchmark
 * Output: prisma/data/dictionary/en-vi/generated-50000.json
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";

// --- Types ---

interface FixtureTranslation {
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number;
  status: string;
  sourceType: string;
  sourceName: string;
}

interface FixtureSense {
  partOfSpeech: string;
  definition: string;
  example?: string;
  tags?: string[];
  usageRank: number;
  translations: FixtureTranslation[];
}

interface FixtureAlias {
  alias: string;
  type: string;
}

interface FixtureEntry {
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  aliases?: FixtureAlias[];
  senses: FixtureSense[];
}

// --- Deterministic pseudo-random number generator (xoshiro128**) ---

function splitmix32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

// --- Syllable pools for synthetic English headwords ---

const ONSETS = [
  "", "b", "c", "d", "f", "g", "h", "j", "k", "l", "m",
  "n", "p", "qu", "r", "s", "st", "sh", "t", "th", "tr", "v", "w", "z",
];
const VOWELS = [
  "a", "e", "i", "o", "u", "ai", "au", "ea", "ee", "ou", "oo", "oi",
];
const CODAS = [
  "", "b", "ck", "d", "g", "k", "l", "ll", "m", "n", "ng", "nk",
  "p", "r", "rn", "rs", "rt", "s", "sh", "sk", "sp", "st", "t", "x",
];

// Vietnamese syllable pools for synthetic translations
const VI_ONSETS = [
  "", "b", "c", "ch", "d", "g", "h", "k", "kh", "l", "m",
  "n", "ng", "nh", "p", "ph", "qu", "r", "s", "t", "th", "tr", "v", "x",
];
const VI_VOWELS = [
  "a", "e", "i", "o", "u", "y", "ai", "ao", "au", "eo",
  "eu", "ia", "ie", "iu", "oa", "oe", "oi", "ou", "ua", "ue", "ui", "uo", "uu",
];
const VI_CODAS = [
  "", "c", "ch", "i", "m", "n", "ng", "nh", "o", "p", "t", "u",
];

const POS_OPTIONS = ["noun", "verb", "adjective", "adverb"];
const STATUS_OPTIONS = ["reviewed", "approved"];
const TAGS_POOL = [
  "common", "education", "technology", "business", "science",
  "health", "nature", "travel", "food", "sports", "music", "art",
];
const DEFINITION_TEMPLATES = [
  "A concept related to {tag}",
  "The act or process of {tag}",
  "Pertaining to the field of {tag}",
  "A type of {tag} activity",
  "Used in the context of {tag}",
];
const EXAMPLE_TEMPLATES = [
  "The {headword} is very useful.",
  "She studied the {headword} carefully.",
  "They discussed the {headword} at length.",
  "The {headword} was mentioned in the report.",
  "We need to understand the {headword} better.",
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateSyllable(rng: () => number): string {
  return pick(ONSETS, rng) + pick(VOWELS, rng) + pick(CODAS, rng);
}

function generateViSyllable(rng: () => number): string {
  return pick(VI_ONSETS, rng) + pick(VI_VOWELS, rng) + pick(VI_CODAS, rng);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateHeadword(rng: () => number, index: number): string {
  // Mix index into the generation for uniqueness
  const syllableCount = Math.floor(rng() * 3) + 1;
  const syllables: string[] = [];
  for (let i = 0; i < syllableCount; i++) {
    syllables.push(generateSyllable(rng));
  }
  return syllables.join(" ");
}

function generateVietnamese(rng: () => number): string {
  const syllableCount = Math.floor(rng() * 3) + 1;
  const syllables: string[] = [];
  for (let i = 0; i < syllableCount; i++) {
    syllables.push(generateViSyllable(rng));
  }
  return syllables.join(" ");
}

function generateEntry(rng: () => number, index: number): FixtureEntry {
  const headword = generateHeadword(rng, index);
  const pos = pick(POS_OPTIONS, rng);
  const vi = generateVietnamese(rng);
  const status = pick(STATUS_OPTIONS, rng);
  const tag = pick(TAGS_POOL, rng);
  const definition = pick(DEFINITION_TEMPLATES, rng).replace("{tag}", tag);
  const example = pick(EXAMPLE_TEMPLATES, rng).replace("{headword}", headword);

  // 30% chance of having a second sense
  const hasSecondSense = rng() < 0.3;

  // 20% chance of having aliases
  const hasAliases = rng() < 0.2;

  const senses: FixtureSense[] = [
    {
      partOfSpeech: pos,
      definition,
      example,
      tags: [tag],
      usageRank: 1,
      translations: [
        {
          targetLanguage: "vi",
          translation: vi,
          isPrimary: true,
          rank: 1,
          confidence: 0.8 + rng() * 0.19,
          status,
          sourceType: "seed",
          sourceName: "benchmark-generated",
        },
      ],
    },
  ];

  if (hasSecondSense) {
    const pos2 = pick(POS_OPTIONS, rng);
    const vi2 = generateVietnamese(rng);
    const tag2 = pick(TAGS_POOL, rng);
    senses.push({
      partOfSpeech: pos2,
      definition: pick(DEFINITION_TEMPLATES, rng).replace("{tag}", tag2),
      example: pick(EXAMPLE_TEMPLATES, rng).replace("{headword}", headword),
      tags: [tag2],
      usageRank: 2,
      translations: [
        {
          targetLanguage: "vi",
          translation: vi2,
          isPrimary: true,
          rank: 1,
          confidence: 0.7 + rng() * 0.2,
          status: pick(STATUS_OPTIONS, rng),
          sourceType: "seed",
          sourceName: "benchmark-generated",
        },
      ],
    });
  }

  const aliases: FixtureAlias[] = [];
  if (hasAliases) {
    const aliasCount = Math.floor(rng() * 2) + 1;
    for (let i = 0; i < aliasCount; i++) {
      aliases.push({
        alias: generateSyllable(rng),
        type: "inflection",
      });
    }
  }

  return {
    headword: headword.trim() || `word${index}`,
    sourceLanguage: "en",
    frequencyRank: index + 1,
    aliases: aliases.length > 0 ? aliases : undefined,
    senses,
  };
}

// --- Main ---

const TARGET_COUNT = 50000;

function main() {
  // Deterministic seed for reproducibility
  const seedValue = 42;
  const rng = splitmix32(seedValue);

  const usedHeadwords = new Set<string>();
  const entries: FixtureEntry[] = [];
  let attempts = 0;

  while (entries.length < TARGET_COUNT && attempts < TARGET_COUNT * 3) {
    const entry = generateEntry(rng, entries.length);
    const normalized = entry.headword.toLowerCase();

    if (!usedHeadwords.has(normalized)) {
      usedHeadwords.add(normalized);
      entries.push(entry);
    }
    attempts++;
  }

  // Filter aliases that collide with other entries' headwords
  for (const entry of entries) {
    const entryNorm = entry.headword.toLowerCase();
    if (entry.aliases) {
      entry.aliases = entry.aliases.filter(
        (a) => !usedHeadwords.has(a.alias.toLowerCase()) || a.alias.toLowerCase() === entryNorm
      );
      if (entry.aliases.length === 0) delete entry.aliases;
    }
  }

  const outputPath = join(
    process.cwd(),
    "prisma/data/dictionary/en-vi/generated-50000.json"
  );
  writeFileSync(outputPath, JSON.stringify(entries, null, 2), "utf8");

  const sizeMB = (
    Buffer.byteLength(JSON.stringify(entries, null, 2), "utf8") /
    1024 /
    1024
  ).toFixed(1);
  console.log(
    `Generated ${entries.length} entries to ${outputPath} (${sizeMB} MB)`
  );
  console.log(
    `Note: This file is gitignored. Regenerate locally for benchmarking.`
  );
}

main();
