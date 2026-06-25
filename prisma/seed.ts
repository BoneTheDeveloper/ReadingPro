/**
 * Seeds dictionary entries from normalized split files into the sense-based dictionary model.
 * Development-only, safe to run multiple times.
 *
 * Usage:
 *   pnpm db:seed:dictionary
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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

// --- Fast dev-only replace from normalized split files ---

async function seedNormalizedBulk(prisma: PrismaClient) {
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
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("Bulk dictionary seed is development-only and is blocked in production environments.");
  }
}

// --- Main ---

async function main() {
  assertDevelopmentBulkSeedAllowed();

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL. Check .env.local.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  await seedNormalizedBulk(prisma);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
