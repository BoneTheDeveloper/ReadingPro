/**
 * Reports read-only dictionary seed status for the configured database.
 *
 * Usage:
 *   pnpm db:check:dictionary-seed
 *
 * This script must not create, update, delete, or reseed data. Use it in local,
 * preview, and protected production workflows to compare DB seed shape against
 * the committed source files.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type LocalCounts = {
  entries: number;
  senses: number;
  translations: number;
  aliases: number;
};

type CountRow = {
  label: string | null;
  count: bigint | number;
};

type TranslationDistributionRow = {
  targetLanguage: string | null;
  status: string | null;
  sourceType: string | null;
  sourceName: string | null;
  count: bigint | number;
};

type AuditRow = {
  batchName: string;
  count: bigint | number;
  latestCreatedAt: Date | null;
};

type SampleRow = {
  headword: string;
  normalizedHeadword: string;
  frequencyRank: number;
  alias: string | null;
  translation: string | null;
};

function loadJsonCount(fileName: string) {
  const baseDir = join(process.cwd(), "prisma/data/dictionary/en-vi");
  const data: unknown[] = JSON.parse(readFileSync(join(baseDir, fileName), "utf8"));
  return data.length;
}

function loadLocalCounts(): LocalCounts {
  return {
    entries: loadJsonCount("entries.json"),
    senses: loadJsonCount("senses.json"),
    translations: loadJsonCount("translations.json"),
    aliases: loadJsonCount("aliases.json"),
  };
}

function formatCount(value: bigint | number) {
  return Number(value);
}

function printCountComparison(local: LocalCounts, remote: LocalCounts) {
  console.log("Dictionary seed counts");
  console.log("----------------------");
  for (const key of ["entries", "senses", "translations", "aliases"] as const) {
    const status = local[key] === remote[key] ? "ok" : "mismatch";
    console.log(`${key.padEnd(13)} local=${local[key]} remote=${remote[key]} ${status}`);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or DIRECT_URL. Seed status checks run read-only SELECT queries against the configured database.");
  }

  const localCounts = loadLocalCounts();
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  try {
    const [entries, senses, translations, aliases] = await Promise.all([
      prisma.dictionaryEntry.count(),
      prisma.dictionarySense.count(),
      prisma.dictionaryTranslation.count(),
      prisma.dictionaryAlias.count(),
    ]);

    printCountComparison(localCounts, { entries, senses, translations, aliases });

    const sourceLanguages = await prisma.$queryRaw<CountRow[]>`
      SELECT source_language AS "label", COUNT(*) AS "count"
      FROM dictionary_entries
      GROUP BY source_language
      ORDER BY source_language
    `;

    console.log("\nEntry source languages");
    for (const row of sourceLanguages) {
      console.log(`${row.label ?? "null"}: ${formatCount(row.count)}`);
    }

    const translationDistributions = await prisma.$queryRaw<TranslationDistributionRow[]>`
      SELECT
        target_language AS "targetLanguage",
        status,
        source_type AS "sourceType",
        source_name AS "sourceName",
        COUNT(*) AS "count"
      FROM dictionary_translations
      GROUP BY target_language, status, source_type, source_name
      ORDER BY COUNT(*) DESC, target_language, status, source_type, source_name
    `;

    console.log("\nTranslation distributions");
    for (const row of translationDistributions) {
      console.log(
        `${row.targetLanguage ?? "null"} / ${row.status ?? "null"} / ${row.sourceType ?? "null"} / ${row.sourceName ?? "null"}: ${formatCount(row.count)}`,
      );
    }

    const auditBatches = await prisma.$queryRaw<AuditRow[]>`
      SELECT batch_name AS "batchName", COUNT(*) AS "count", MAX(created_at) AS "latestCreatedAt"
      FROM dictionary_source_audits
      GROUP BY batch_name
      ORDER BY MAX(created_at) DESC NULLS LAST, batch_name
      LIMIT 5
    `;

    console.log("\nRecent source audit batches");
    if (auditBatches.length === 0) {
      console.log("none");
    }
    for (const row of auditBatches) {
      console.log(`${row.batchName}: ${formatCount(row.count)} rows, latest=${row.latestCreatedAt?.toISOString() ?? "null"}`);
    }

    const samples = await prisma.$queryRaw<SampleRow[]>`
      SELECT
        e.headword,
        e.normalized_headword AS "normalizedHeadword",
        e.frequency_rank AS "frequencyRank",
        a.normalized_alias AS "alias",
        t.translation
      FROM dictionary_entries e
      LEFT JOIN dictionary_aliases a ON a.entry_id = e.id
      LEFT JOIN dictionary_senses s ON s.entry_id = e.id
      LEFT JOIN dictionary_translations t ON t.sense_id = s.id
        AND t.target_language = 'vi'
        AND t.status IN ('reviewed', 'approved')
        AND t.is_primary = true
      WHERE e.normalized_headword IN ('the', 'be', 'study')
        OR a.normalized_alias IN ('lives', 'leaves')
      ORDER BY e.frequency_rank, e.normalized_headword, a.normalized_alias NULLS LAST
      LIMIT 12
    `;

    console.log("\nRepresentative samples");
    if (samples.length === 0) {
      console.log("none");
    }
    for (const row of samples) {
      console.log(
        `${row.frequencyRank}: ${row.headword} (${row.normalizedHeadword}) alias=${row.alias ?? "none"} translation=${row.translation ?? "none"}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed status check failed:", error);
  process.exit(1);
});
