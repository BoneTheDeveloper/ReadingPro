/**
 * Seeds dictionary entries from the fixture JSON file into the sense-based dictionary model.
 * Idempotent: safe to run multiple times. Syncs fixture data deterministically.
 *
 * Usage: pnpm db:seed:dictionary
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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

const BATCH_NAME = "seed:en-vi:mvp";

async function seedEntry(prisma: PrismaClient, entry: FixtureEntry, index: number, total: number) {
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
    select: { id: true, partOfSpeech: true, definition: true },
  });

  // We cannot reliably match old senses to new ones by content alone,
  // so we delete all existing senses and re-create. This is safe for seed data.
  const existingSenseIds = existingSenses.map((s) => s.id);
  if (existingSenseIds.length > 0) {
    // Delete translations first (cascade would handle, but explicit is clearer)
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
          reviewedAt: tr.status === "reviewed" ? new Date() : null,
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
      batchName: BATCH_NAME,
      entityType: "DictionaryEntry",
      entityId: dictionaryEntry.id,
      note: `Seed entry "${entry.headword}" synced from fixture`,
    },
  });

  console.log(`  [${index + 1}/${total}] seeded: "${entry.headword}" (${entry.senses.length} senses)`);
}

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL. Check .env.local.");
  }

  const fixturePath = join(process.cwd(), "prisma/data/dictionary/en-vi/entries.json");
  const raw = readFileSync(fixturePath, "utf8");
  const entries: FixtureEntry[] = JSON.parse(raw);

  console.log(`Connecting to database...`);
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  console.log(`Seeding ${entries.length} dictionary entries from fixture...\n`);

  for (let i = 0; i < entries.length; i++) {
    await seedEntry(prisma, entries[i], i, entries.length);
  }

  console.log(`\nDone. Seeded ${entries.length} entries (batch: ${BATCH_NAME})`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
