import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db/client";
import { normalizeDictionaryTerm } from "./normalize-dictionary-term";
import { RUNTIME_STATUSES } from "./dictionary-dtos";

export type HeadwordPrefixRow = Awaited<ReturnType<typeof findEntriesByHeadwordPrefix>>;
export type AliasPrefixRow = Awaited<ReturnType<typeof findEntriesByAliasPrefix>>;

export async function findEntriesByHeadwordPrefix(
  prefix: string,
  sourceLanguage: string,
  limit = 8,
) {
  const normalized = normalizeDictionaryTerm(prefix);
  if (normalized.length < 2) return [];

  return Sentry.startSpan(
    {
      name: "db:dictionary-suggest-headword-prefix",
      op: "db",
      attributes: {
        "db.operation": "findMany",
        "dictionary.prefix": normalized,
      },
    },
    () =>
      db.dictionaryEntry.findMany({
        where: {
          normalizedHeadword: { startsWith: normalized },
          sourceLanguage,
          senses: {
            some: {
              translations: {
                some: {
                  targetLanguage: "vi",
                  status: { in: [...RUNTIME_STATUSES] },
                  isPrimary: true,
                },
              },
            },
          },
        },
        orderBy: [{ frequencyRank: "asc" }, { normalizedHeadword: "asc" }],
        take: limit,
        include: {
          senses: {
            orderBy: { usageRank: "asc" },
            take: 1,
            include: {
              translations: {
                where: {
                  targetLanguage: "vi",
                  status: { in: [...RUNTIME_STATUSES] },
                  isPrimary: true,
                },
                orderBy: [{ rank: "asc" }],
                take: 1,
              },
            },
          },
          aliases: {
            where: { normalizedAlias: { startsWith: normalized } },
            take: 1,
          },
        },
      }),
  );
}

export async function findEntriesByAliasPrefix(
  prefix: string,
  sourceLanguage: string,
  limit = 8,
) {
  const normalized = normalizeDictionaryTerm(prefix);
  if (normalized.length < 2) return [];

  return Sentry.startSpan(
    {
      name: "db:dictionary-suggest-alias-prefix",
      op: "db",
      attributes: {
        "db.operation": "findMany",
        "dictionary.prefix": normalized,
      },
    },
    async () => {
      const aliases = await db.dictionaryAlias.findMany({
        where: {
          normalizedAlias: { startsWith: normalized },
          entry: { sourceLanguage },
        },
        take: limit,
        include: {
          entry: {
            include: {
              senses: {
                orderBy: { usageRank: "asc" },
                take: 1,
                include: {
                  translations: {
                    where: {
                      targetLanguage: "vi",
                      status: { in: [...RUNTIME_STATUSES] },
                      isPrimary: true,
                    },
                    orderBy: [{ rank: "asc" }],
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      return aliases.map((a) => ({
        ...a.entry,
        matchedAlias: a.normalizedAlias,
        aliasType: a.aliasType,
      }));
    },
  );
}
