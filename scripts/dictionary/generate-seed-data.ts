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

interface FixtureEntry {
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  senses: FixtureSense[];
}

const PARTS_OF_SPEECH = ["noun", "verb", "adj", "adv", "preposition", "conjunction"];
const VI_PREFIXES = ["cai", "nguoi", "viec", "su", "tinh", "quoc", "mon", "cot", "phuong", "dien"];
const VI_ROOTS = ["hoc", "lam", "noi", "ghi", "doc", "viet", "nghi", "thich", "biet", "hieu", "dung", "chay", "an", "choi", "ngu", "di", "den", "ve", "len", "xuong"];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateEntry(index: number, rand: () => number): FixtureEntry {
  const headword = `word_${index.toString().padStart(5, "0")}`;
  const pos = PARTS_OF_SPEECH[Math.floor(rand() * PARTS_OF_SPEECH.length)];
  const viRoot = VI_ROOTS[Math.floor(rand() * VI_ROOTS.length)];
  const viPrefix = VI_PREFIXES[Math.floor(rand() * VI_PREFIXES.length)];

  return {
    headword,
    sourceLanguage: "en",
    frequencyRank: index + 1,
    senses: [
      {
        partOfSpeech: pos,
        definition: `Definition for ${headword} (${pos})`,
        example: `This is an example using ${headword}.`,
        tags: [],
        usageRank: 1,
        translations: [
          {
            targetLanguage: "vi",
            translation: `${viPrefix} ${viRoot}`,
            isPrimary: true,
            rank: 1,
            confidence: 0.5 + rand() * 0.4,
            status: "draft",
            sourceType: "llm",
            sourceName: "benchmark-generator",
          },
        ],
      },
    ],
  };
}

function main() {
  const count = 50_000;
  const rand = seededRandom(42);
  const entries: FixtureEntry[] = [];

  for (let i = 0; i < count; i++) {
    entries.push(generateEntry(i, rand));
  }

  const outputPath = join(process.cwd(), "prisma/data/dictionary/en-vi/generated-50000.json");
  writeFileSync(outputPath, JSON.stringify(entries, null, 2));
  console.log(`Generated ${count} entries to ${outputPath}`);
}

main();
