/**
 * Seeds dictionary entries from normalized split files into the sense-based dictionary model.
 * Idempotent: safe to run multiple times. Syncs data deterministically.
 *
 * Usage:
 *   pnpm db:seed:dictionary                # default: production split files
 *   pnpm db:seed:dictionary small-test     # use fixtures/small-test.json
 *   pnpm db:seed:dictionary entries        # legacy nested entries.json format
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// --- Dataset resolution ---

type DatasetMode = "normalized" | "small-test" | "entries";

function resolveDatasetArg(): DatasetMode {
  const arg = process.argv[2];
  if (!arg) return "normalized";
  if (arg === "small-test") return "small-test";
  if (arg === "entries") return "entries";
  console.error(`Unknown dataset "${arg}". Valid: small-test, entries (no arg = normalized split files)`);
  process.exit(1);
}

// --- Normalize ---

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

// --- Legacy nested types ---

interface LegacyTranslation {
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number;
  status: string;
  sourceType: string;
  sourceName: string;
}

interface LegacySense {
  partOfSpeech: string;
  definition: string;
  example?: string;
  tags?: string[];
  usageRank: number;
  translations: LegacyTranslation[];
}

interface LegacyAlias {
  alias: string;
  type: string;
}

interface LegacyEntry {
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  aliases?: LegacyAlias[];
  senses: LegacySense[];
}

// --- Seed from normalized split files ---

async function seedNormalized(prisma: PrismaClient) {
  const baseDir = join(process.cwd(), "prisma/data/dictionary/en-vi");
  const entries: NormalizedEntry[] = JSON.parse(readFileSync(join(baseDir, "entries.json"), "utf8"));
  const senses: NormalizedSense[] = JSON.parse(readFileSync(join(baseDir, "senses.json"), "utf8"));
  const translations: NormalizedTranslation[] = JSON.parse(readFileSync(join(baseDir, "translations.json"), "utf8"));
  const aliases: NormalizedAlias[] = JSON.parse(readFileSync(join(baseDir, "aliases.json"), "utf8"));

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

// --- Seed from legacy nested format ---

async function seedLegacy(prisma: PrismaClient, dataset: string) {
  const fixturePath = join(process.cwd(), `prisma/data/dictionary/en-vi/${dataset}.json`);
  const raw = readFileSync(fixturePath, "utf8");
  const entries: LegacyEntry[] = JSON.parse(raw);

  const batchName = `seed:en-vi:${dataset}`;
  const deleted = await prisma.dictionarySourceAudit.deleteMany({ where: { batchName } });
  if (deleted.count > 0) console.log(`Cleared ${deleted.count} previous audit rows`);

  console.log(`Seeding ${entries.length} entries from "${dataset}" (legacy format)...\n`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const normalizedHeadword = normalizeTerm(entry.headword);
    const sourceLanguage = entry.sourceLanguage ?? "en";

    const dictionaryEntry = await prisma.dictionaryEntry.upsert({
      where: { normalizedHeadword_sourceLanguage: { normalizedHeadword, sourceLanguage } },
      update: { headword: entry.headword, frequencyRank: entry.frequencyRank },
      create: { headword: entry.headword, normalizedHeadword, sourceLanguage, frequencyRank: entry.frequencyRank },
    });

    const existingSenses = await prisma.dictionarySense.findMany({ where: { entryId: dictionaryEntry.id }, select: { id: true } });
    if (existingSenses.length > 0) {
      await prisma.dictionaryTranslation.deleteMany({ where: { senseId: { in: existingSenses.map((s) => s.id) } } });
      await prisma.dictionarySense.deleteMany({ where: { id: { in: existingSenses.map((s) => s.id) } } });
    }
    await prisma.dictionaryAlias.deleteMany({ where: { entryId: dictionaryEntry.id } });

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

    if (Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        await prisma.dictionaryAlias.create({
          data: { entryId: dictionaryEntry.id, normalizedAlias: normalizeTerm(alias.alias), aliasType: alias.type },
        });
      }
    }

    await prisma.dictionarySourceAudit.create({
      data: {
        batchName,
        entityType: "DictionaryEntry",
        entityId: dictionaryEntry.id,
        note: `Seed entry "${entry.headword}" synced from ${dataset} fixture`,
      },
    });

    if ((i + 1) % 50 === 0 || i === 0 || i === entries.length - 1) {
      console.log(`  [${i + 1}/${entries.length}] seeded: "${entry.headword}" (${entry.senses.length} senses)`);
    }
  }

  console.log(`\nDone. Seeded ${entries.length} entries (dataset: ${dataset})`);
}

// --- Main ---

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL. Check .env.local.");
  }

  const mode = resolveDatasetArg();
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  if (mode === "normalized") {
    await seedNormalized(prisma);
  } else if (mode === "small-test") {
    await seedLegacy(prisma, "fixtures/small-test");
  } else {
    await seedLegacy(prisma, "entries");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
