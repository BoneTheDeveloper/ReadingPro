import { db } from "./client";
import { normalizeDictionaryTerm } from "@/lib/dictionary/normalize-dictionary-term";
import { RUNTIME_STATUSES } from "@/lib/dictionary/dictionary-dtos";

export async function findEntryByHeadword(
  normalizedHeadword: string,
  sourceLanguage: string,
) {
  return db.dictionaryEntry.findUnique({
    where: {
      normalizedHeadword_sourceLanguage: { normalizedHeadword, sourceLanguage },
    },
    include: {
      senses: {
        orderBy: { usageRank: "asc" },
        include: {
          translations: {
            where: {
              targetLanguage: "vi",
              status: { in: [...RUNTIME_STATUSES] },
            },
            orderBy: [{ rank: "asc" }],
          },
        },
      },
      aliases: true,
    },
  });
}

export async function findEntryByAliasTerm(
  normalizedAlias: string,
  sourceLanguage: string,
) {
  const alias = await db.dictionaryAlias.findFirst({
    where: {
      normalizedAlias,
      entry: { sourceLanguage },
    },
    include: {
      entry: {
        include: {
          senses: {
            orderBy: { usageRank: "asc" },
            include: {
              translations: {
                where: {
                  targetLanguage: "vi",
                  status: { in: [...RUNTIME_STATUSES] },
                },
                orderBy: [{ rank: "asc" }],
              },
            },
          },
          aliases: true,
        },
      },
    },
  });

  return alias?.entry ?? null;
}

export async function findEntriesByHeadwordPrefix(
  prefix: string,
  sourceLanguage: string,
  limit = 8,
) {
  const normalized = normalizeDictionaryTerm(prefix);
  if (normalized.length < 2) return [];

  return db.dictionaryEntry.findMany({
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
  });
}

export async function findEntriesByAliasPrefix(
  prefix: string,
  sourceLanguage: string,
  limit = 8,
) {
  const normalized = normalizeDictionaryTerm(prefix);
  if (normalized.length < 2) return [];

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
}

export async function findEntryById(
  entryId: string,
  sourceLanguage: string,
  targetLanguage: string = "vi",
) {
  const entry = await db.dictionaryEntry.findUnique({
    where: { id: entryId },
    include: {
      senses: {
        orderBy: { usageRank: "asc" },
        include: {
          translations: {
            where: {
              targetLanguage,
              status: { in: [...RUNTIME_STATUSES] },
            },
            orderBy: [{ rank: "asc" }],
          },
        },
      },
    },
  });

  if (!entry || entry.sourceLanguage !== sourceLanguage) return null;
  return entry;
}

export async function findEntriesContaining(
  substring: string,
  sourceLanguage: string,
  limit: number = 8,
  excludeIds: string[] = [],
) {
  if (substring.length < 2) return [];

  return db.dictionaryEntry.findMany({
    where: {
      normalizedHeadword: { contains: substring },
      sourceLanguage,
      id: { notIn: excludeIds },
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
    },
  });
}
