import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { RUNTIME_STATUSES } from "./dictionary-dtos";

export type LookupEntryRow = Awaited<ReturnType<typeof findEntryByHeadword>>;

export async function findEntryByHeadword(
  normalizedHeadword: string,
  sourceLanguage: string,
) {
  return Sentry.startSpan(
    {
      name: "db:dictionary-lookup-by-headword",
      op: "db",
      attributes: {
        "db.operation": "findUnique",
        "dictionary.normalized_headword": normalizedHeadword,
      },
    },
    () =>
      db.dictionaryEntry.findUnique({
        where: { normalizedHeadword_sourceLanguage: { normalizedHeadword, sourceLanguage } },
        include: {
          senses: {
            orderBy: { usageRank: "asc" },
            include: {
              translations: {
                where: { targetLanguage: "vi" },
                orderBy: [{ rank: "asc" }],
              },
            },
          },
        },
      }),
  );
}

export async function findEntryByAlias(
  normalizedAlias: string,
  sourceLanguage: string,
) {
  return Sentry.startSpan(
    {
      name: "db:dictionary-lookup-by-alias",
      op: "db",
      attributes: {
        "db.operation": "findFirst",
        "dictionary.normalized_alias": normalizedAlias,
      },
    },
    async () => {
      const alias = await db.dictionaryAlias.findFirst({
        where: { normalizedAlias, entry: { sourceLanguage } },
        include: {
          entry: {
            include: {
              senses: {
                orderBy: { usageRank: "asc" },
                include: {
                  translations: {
                    where: { targetLanguage: "vi" },
                    orderBy: [{ rank: "asc" }],
                  },
                },
              },
            },
          },
        },
      });

      return alias?.entry ?? null;
    },
  );
}

export interface QuickLookupRow {
  id: string;
  senseId: string;
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number | null;
  status: string;
  sourceType: string;
  sourceName: string | null;
  reviewedAt: Date | null;
  matchType: number;
}

export interface QuickLookupOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

const QUICK_LOOKUP_STATUSES = Prisma.join(RUNTIME_STATUSES);

export async function findQuickLookupTranslation(
  normalizedTerm: string,
  options: QuickLookupOptions,
): Promise<QuickLookupRow[]> {
  return Sentry.startSpan(
    {
      name: "db:dictionary-quick-lookup",
      op: "db",
      attributes: {
        "db.operation": "queryRaw",
        "dictionary.normalized_term_length": normalizedTerm.length,
      },
    },
    () =>
      db.$queryRaw<QuickLookupRow[]>`
        SELECT
          t.id,
          t."senseId",
          t."targetLanguage",
          t.translation,
          t."isPrimary",
          t.rank,
          t.confidence,
          t.status,
          t."sourceType",
          t."sourceName",
          t."reviewedAt",
          CASE WHEN e."normalizedHeadword" = ${normalizedTerm} THEN 0 ELSE 1 END AS "matchType"
        FROM dictionary_entries e
        LEFT JOIN dictionary_aliases a
          ON a."entryId" = e.id AND a."normalizedAlias" = ${normalizedTerm}
        JOIN dictionary_senses s ON s."entryId" = e.id
        JOIN dictionary_translations t
          ON t."senseId" = s.id
          AND t."targetLanguage" = ${options.targetLanguage}
          AND t.status IN (${QUICK_LOOKUP_STATUSES})
          AND t."isPrimary" = true
        WHERE e."sourceLanguage" = ${options.sourceLanguage}
          AND (e."normalizedHeadword" = ${normalizedTerm} OR a.id IS NOT NULL)
        ORDER BY "matchType" ASC, s."usageRank" ASC, t.rank ASC
        LIMIT 1
      `,
  );
}
