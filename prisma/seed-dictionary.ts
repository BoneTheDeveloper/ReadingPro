/**
 * Seeds dictionary entries from a fixture JSON file into the sense-based dictionary model.
 * Idempotent: safe to run multiple times. Syncs fixture data deterministically.
 *
 * Usage:
 *   pnpm db:seed:dictionary                # default: common-1000
 *   pnpm db:seed:dictionary small-test     # use small-test.json
 *   pnpm db:seed:dictionary common-1000    # use common-1000.json
 *   pnpm db:seed:dictionary generated-50000 # use generated-50000.json
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// --- Dataset resolution ---

const VALID_DATASETS = new Set(["small-test", "common-1000", "generated-50000", "entries"]);

function resolveDatasetArg(): string {
  const arg = process.argv[2];
  if (!arg) return "common-1000";
  if (VALID_DATASETS.has(arg)) return arg;
  console.error(`Unknown dataset "${arg}". Valid: ${[...VALID_DATASETS].join(", ")}`);
  process.exit(1);
}

// --- Inline normalize (standalone tsx script, no path alias resolution) ---

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Fixture types (mirror JSON shape) ---

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

// --- Seed logic ---

async function seedEntry(prisma: PrismaClient, entry: FixtureEntry, index: number, total: number, dataset: string) {
  const normalizedHeadword = normalizeTerm(entry.headword);
  const sourceLanguage = entry.sourceLanguage ?? "en";

  // 1. Upsert DictionaryEntry
  const dictionaryEntry = await prisma.dictionaryEntry.upsert({
    where: { normalizedHeadword_sourceLanguage: { normalizedHeadword, sourceLanguage } },
    update: {
      headword: entry.headword,
      frequencyRank: entry.frequencyRank,
    },
    create: {
      headword: entry.headword,
      normalizedHeadword,
      sourceLanguage,
      frequencyRank: entry.frequencyRank,
    },
  });

  // 2. Delete existing senses not in fixture (deterministic sync)
  const existingSenses = await prisma.dictionarySense.findMany({
    where: { entryId: dictionaryEntry.id },
    select: { id: true },
  });

  const existingSenseIds = existingSenses.map((s) => s.id);
  if (existingSenseIds.length > 0) {
    await prisma.dictionaryTranslation.deleteMany({
      where: { senseId: { in: existingSenseIds } },
    });
    await prisma.dictionarySense.deleteMany({
      where: { id: { in: existingSenseIds } },
    });
  }

  // 3. Delete existing aliases and re-create
  await prisma.dictionaryAlias.deleteMany({
    where: { entryId: dictionaryEntry.id },
  });

  // 4. Create senses + translations
  for (const sense of entry.senses) {
    const createdSense = await prisma.dictionarySense.create({
      data: {
        entryId: dictionaryEntry.id,
        partOfSpeech: sense.partOfSpeech ?? null,
        definition: sense.definition ?? null,
        example: sense.example ?? null,
        tags: sense.tags ?? [],
        usageRank: sense.usageRank,
      },
    });

    for (const tr of sense.translations) {
      await prisma.dictionaryTranslation.create({
        data: {
          senseId: createdSense.id,
          targetLanguage: tr.targetLanguage,
          translation: tr.translation,
          isPrimary: tr.isPrimary,
          rank: tr.rank,
          confidence: tr.confidence,
          status: tr.status,
          sourceType: tr.sourceType,
          sourceName: tr.sourceName ?? null,
          reviewedAt: tr.status === "reviewed" || tr.status === "approved" ? new Date() : null,
        },
      });
    }
  }

  // 5. Create aliases
  if (Array.isArray(entry.aliases)) {
    for (const alias of entry.aliases) {
      await prisma.dictionaryAlias.create({
        data: {
          entryId: dictionaryEntry.id,
          normalizedAlias: normalizeTerm(alias.alias),
          aliasType: alias.type,
        },
      });
    }
  }

  // 6. Create source audit entry
  await prisma.dictionarySourceAudit.create({
    data: {
      batchName: `seed:en-vi:${dataset}`,
      entityType: "DictionaryEntry",
      entityId: dictionaryEntry.id,
      note: `Seed entry "${entry.headword}" synced from ${dataset} fixture`,
    },
  });

  if ((index + 1) % 50 === 0 || index === 0 || index === total - 1) {
    console.log(`  [${index + 1}/${total}] seeded: "${entry.headword}" (${entry.senses.length} senses)`);
  }
}

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL. Check .env.local.");
  }

  const dataset = resolveDatasetArg();
  const fixturePath = join(process.cwd(), `prisma/data/dictionary/en-vi/${dataset}.json`);
  const raw = readFileSync(fixturePath, "utf8");
  const entries: FixtureEntry[] = JSON.parse(raw);

  console.log(`Connecting to database...`);
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  // Clean previous audit rows for this batch to prevent unbounded accumulation
  const batchName = `seed:en-vi:${dataset}`;
  const deleted = await prisma.dictionarySourceAudit.deleteMany({
    where: { batchName },
  });
  if (deleted.count > 0) {
    console.log(`Cleared ${deleted.count} previous audit rows for batch "${batchName}"`);
  }

  console.log(`Seeding ${entries.length} dictionary entries from "${dataset}" fixture...\n`);

  for (let i = 0; i < entries.length; i++) {
    await seedEntry(prisma, entries[i], i, entries.length, dataset);
  }

  console.log(`\nDone. Seeded ${entries.length} entries (dataset: ${dataset})`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
