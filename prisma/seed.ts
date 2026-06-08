/**
 * Seeds dictionary entries from normalized split files into the sense-based dictionary model.
 * Idempotent: safe to run multiple times. Syncs data deterministically.
 *
 * Usage:
 *   pnpm db:seed:dictionary                # default: production split files
 *   pnpm db:seed:dictionary:bulk:dev       # fast dev-only replace from production split files
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function assertNoDatasetArg() {
  const arg = process.argv[2];
  if (!arg) return;
  console.error(`Unknown dataset "${arg}". Dictionary seed uses normalized split files only.`);
  process.exit(1);
}

// --- Normalized split-file types ---

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

interface NormalizedSeedData {
  entries: NormalizedEntry[];
  senses: NormalizedSense[];
  translations: NormalizedTranslation[];
  aliases: NormalizedAlias[];
}

function loadNormalizedSeedData(): NormalizedSeedData {
  const baseDir = join(process.cwd(), "prisma/data/dictionary/en-vi");

  return {
    entries: JSON.parse(readFileSync(join(baseDir, "entries.json"), "utf8")),
    senses: JSON.parse(readFileSync(join(baseDir, "senses.json"), "utf8")),
    translations: JSON.parse(readFileSync(join(baseDir, "translations.json"), "utf8")),
    aliases: JSON.parse(readFileSync(join(baseDir, "aliases.json"), "utf8")),
  };
}

// --- Seed from normalized split files ---

async function seedNormalized(prisma: PrismaClient) {
  const { entries, senses, translations, aliases } = loadNormalizedSeedData();

  const sensesByEntry = new Map<string, NormalizedSense[]>();
  for (const s of senses) {
    if (!sensesByEntry.has(s.entryKey)) sensesByEntry.set(s.entryKey, []);
    sensesByEntry.get(s.entryKey)!.push(s);
  }

  const translationsBySense = new Map<string, NormalizedTranslation[]>();
  for (const t of translations) {
    if (!translationsBySense.has(t.senseKey)) translationsBySense.set(t.senseKey, []);
    translationsBySense.get(t.senseKey)!.push(t);
  }

  const aliasesByEntry = new Map<string, NormalizedAlias[]>();
  for (const a of aliases) {
    if (!aliasesByEntry.has(a.entryKey)) aliasesByEntry.set(a.entryKey, []);
    aliasesByEntry.get(a.entryKey)!.push(a);
  }

  // Clean previous audit rows
  const batchName = "seed:en-vi:normalized";
  const deleted = await prisma.dictionarySourceAudit.deleteMany({ where: { batchName } });
  if (deleted.count > 0) console.log(`Cleared ${deleted.count} previous audit rows`);

  console.log(`Seeding ${entries.length} entries from normalized split files...\n`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    const dictionaryEntry = await prisma.dictionaryEntry.upsert({
      where: { normalizedHeadword_sourceLanguage: { normalizedHeadword: entry.normalizedHeadword, sourceLanguage: entry.sourceLanguage } },
      update: { headword: entry.headword, frequencyRank: entry.frequencyRank },
      create: {
        headword: entry.headword,
        normalizedHeadword: entry.normalizedHeadword,
        sourceLanguage: entry.sourceLanguage,
        frequencyRank: entry.frequencyRank,
      },
    });

    // Delete existing senses + translations for deterministic sync
    const existingSenses = await prisma.dictionarySense.findMany({ where: { entryId: dictionaryEntry.id }, select: { id: true } });
    if (existingSenses.length > 0) {
      await prisma.dictionaryTranslation.deleteMany({ where: { senseId: { in: existingSenses.map((s) => s.id) } } });
      await prisma.dictionarySense.deleteMany({ where: { id: { in: existingSenses.map((s) => s.id) } } });
    }

    await prisma.dictionaryAlias.deleteMany({ where: { entryId: dictionaryEntry.id } });

    const entrySenses = sensesByEntry.get(entry.entryKey) ?? [];
    for (const sense of entrySenses) {
      const createdSense = await prisma.dictionarySense.create({
        data: {
          entryId: dictionaryEntry.id,
          partOfSpeech: sense.partOfSpeech,
          definition: sense.definition,
          example: sense.example,
          tags: sense.tags,
          usageRank: sense.usageRank,
        },
      });

      const senseTranslations = translationsBySense.get(sense.senseKey) ?? [];
      for (const tr of senseTranslations) {
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
            sourceName: tr.sourceName,
            reviewedAt: tr.status === "reviewed" || tr.status === "approved" ? new Date() : null,
          },
        });
      }
    }

    const entryAliases = aliasesByEntry.get(entry.entryKey) ?? [];
    for (const alias of entryAliases) {
      await prisma.dictionaryAlias.create({
        data: {
          entryId: dictionaryEntry.id,
          normalizedAlias: alias.normalizedAlias,
          aliasType: alias.aliasType,
        },
      });
    }

    await prisma.dictionarySourceAudit.create({
      data: {
        batchName,
        entityType: "DictionaryEntry",
        entityId: dictionaryEntry.id,
        note: `Seed entry "${entry.headword}" synced from normalized split files`,
      },
    });

    if ((i + 1) % 50 === 0 || i === 0 || i === entries.length - 1) {
      console.log(`  [${i + 1}/${entries.length}] seeded: "${entry.headword}" (${entrySenses.length} senses)`);
    }
  }

  console.log(`\nDone. Seeded ${entries.length} entries (normalized split files)`);
}

// --- Fast dev-only replace from normalized split files ---

async function seedNormalizedBulk(prisma: PrismaClient) {
  assertDevelopmentBulkSeedAllowed();

  const { entries, senses, translations, aliases } = loadNormalizedSeedData();
  const batchName = "seed:en-vi:normalized";
  const now = new Date();

  const entryIds = new Map<string, string>();
  const senseIds = new Map<string, string>();

  for (const entry of entries) {
    entryIds.set(entry.entryKey, randomUUID());
  }

  for (const sense of senses) {
    senseIds.set(sense.senseKey, randomUUID());
  }

  console.log(`Bulk replacing dictionary seed data for development...`);
  console.log(`  entries:      ${entries.length}`);
  console.log(`  senses:       ${senses.length}`);
  console.log(`  translations: ${translations.length}`);
  console.log(`  aliases:      ${aliases.length}`);

  await prisma.$transaction(async (tx) => {
    await tx.dictionarySourceAudit.deleteMany({});
    await tx.dictionaryAlias.deleteMany({});
    await tx.dictionaryTranslation.deleteMany({});
    await tx.dictionarySense.deleteMany({});
    await tx.dictionaryEntry.deleteMany({});

    await tx.dictionaryEntry.createMany({
      data: entries.map((entry) => ({
        id: entryIds.get(entry.entryKey)!,
        headword: entry.headword,
        normalizedHeadword: entry.normalizedHeadword,
        sourceLanguage: entry.sourceLanguage,
        frequencyRank: entry.frequencyRank,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await tx.dictionarySense.createMany({
      data: senses.map((sense) => ({
        id: senseIds.get(sense.senseKey)!,
        entryId: entryIds.get(sense.entryKey)!,
        partOfSpeech: sense.partOfSpeech,
        definition: sense.definition,
        example: sense.example,
        tags: sense.tags,
        usageRank: sense.usageRank,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await tx.dictionaryTranslation.createMany({
      data: translations.map((translation) => ({
        id: randomUUID(),
        senseId: senseIds.get(translation.senseKey)!,
        targetLanguage: translation.targetLanguage,
        translation: translation.translation,
        isPrimary: translation.isPrimary,
        rank: translation.rank,
        confidence: translation.confidence,
        status: translation.status,
        sourceType: translation.sourceType,
        sourceName: translation.sourceName,
        reviewedAt: translation.status === "reviewed" || translation.status === "approved" ? now : null,
        createdAt: now,
        updatedAt: now,
      })),
    });

    if (aliases.length > 0) {
      await tx.dictionaryAlias.createMany({
        data: aliases.map((alias) => ({
          id: randomUUID(),
          entryId: entryIds.get(alias.entryKey)!,
          normalizedAlias: alias.normalizedAlias,
          aliasType: alias.aliasType,
        })),
      });
    }

    await tx.dictionarySourceAudit.createMany({
      data: entries.map((entry) => ({
        id: randomUUID(),
        batchName,
        entityType: "DictionaryEntry",
        entityId: entryIds.get(entry.entryKey)!,
        note: `Seed entry "${entry.headword}" bulk replaced from normalized split files`,
        createdAt: now,
      })),
    });
  }, { timeout: 120_000 });

  console.log(`\nDone. Bulk replaced ${entries.length} dictionary entries for development.`);
}

function assertDevelopmentBulkSeedAllowed() {
  if (process.env.DICTIONARY_SEED_BULK_TARGET !== "development") {
    throw new Error("Bulk dictionary seed requires DICTIONARY_SEED_BULK_TARGET=development.");
  }
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("Bulk dictionary seed is development-only and is blocked in production environments.");
  }
}

// --- Main ---

async function main() {
  assertNoDatasetArg();

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL. Check .env.local.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  if (process.env.DICTIONARY_SEED_BULK === "1") {
    await seedNormalizedBulk(prisma);
  } else {
    await seedNormalized(prisma);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
