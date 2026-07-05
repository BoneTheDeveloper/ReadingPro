import "server-only";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/lib/db";
import {
  escapeLikeWildcards,
  normalizeDictionaryTerm,
} from "@/contracts/dictionary/normalize-dictionary-term";
import { RUNTIME_STATUSES } from "@/contracts/dictionary/dictionary-dtos";

export interface SuggestCandidateRow {
  id: string;
  headword: string;
  normalizedHeadword: string;
  frequencyRank: number;
  matchType: string;
  matchedAlias: string | null;
  aliasType: string | null;
  primaryTranslation: string | null;
}

const RUNTIME_STATUS_LIST = Prisma.join(RUNTIME_STATUSES);

export async function findSuggestCandidates(
  prefix: string,
  sourceLanguage: string,
  limit = 8,
): Promise<SuggestCandidateRow[]> {
  const normalized = normalizeDictionaryTerm(prefix);
  if (normalized.length < 2) return [];

  const likePrefix = escapeLikeWildcards(normalized) + "%";

  return Sentry.startSpan(
    {
      name: "db:dictionary-suggest-candidates",
      op: "db",
      attributes: {
        "db.operation": "queryRaw",
        "dictionary.prefix": normalized,
      },
    },
    () =>
      db.$queryRaw<SuggestCandidateRow[]>`
        WITH headword_candidates AS (
          SELECT
            e.id,
            e.headword,
            e."normalizedHeadword",
            e."frequencyRank",
            CASE WHEN e."normalizedHeadword" = ${normalized} THEN 'exact' ELSE 'prefix' END AS match_type,
            NULL::text AS matched_alias,
            NULL::text AS alias_type
          FROM dictionary_entries e
          WHERE e."normalizedHeadword" LIKE ${likePrefix}
            AND e."sourceLanguage" = ${sourceLanguage}
            AND EXISTS (
              SELECT 1 FROM dictionary_senses s
              JOIN dictionary_translations t ON t."senseId" = s.id
                AND t."targetLanguage" = 'vi'
                AND t.status IN (${RUNTIME_STATUS_LIST})
                AND t."isPrimary" = true
              WHERE s."entryId" = e.id
            )
          ORDER BY e."frequencyRank" ASC, e."normalizedHeadword" ASC
          LIMIT ${limit * 2}
        ),
        alias_candidates AS (
          SELECT
            e.id,
            e.headword,
            e."normalizedHeadword",
            e."frequencyRank",
            CASE WHEN a."normalizedAlias" = ${normalized} THEN 'alias' ELSE 'prefix' END AS match_type,
            a."normalizedAlias" AS matched_alias,
            a."aliasType" AS alias_type
          FROM dictionary_aliases a
          JOIN dictionary_entries e ON e.id = a."entryId"
          WHERE a."normalizedAlias" LIKE ${likePrefix}
            AND e."sourceLanguage" = ${sourceLanguage}
          ORDER BY e."frequencyRank" ASC, a."normalizedAlias" ASC
          LIMIT ${limit * 2}
        ),
        all_candidates AS (
          SELECT * FROM headword_candidates
          UNION ALL
          SELECT * FROM alias_candidates
        ),
        deduped AS (
          SELECT DISTINCT ON (id)
            id, headword, "normalizedHeadword", "frequencyRank",
            match_type, matched_alias, alias_type
          FROM all_candidates
          ORDER BY id,
            CASE match_type
              WHEN 'exact' THEN 0
              WHEN 'alias' THEN 1
              ELSE 2
            END
        )
        SELECT
          d.id,
          d.headword,
          d."normalizedHeadword",
          d."frequencyRank",
          d.match_type AS "matchType",
          d.matched_alias AS "matchedAlias",
          d.alias_type AS "aliasType",
          pt.translation AS "primaryTranslation"
        FROM deduped d
        LEFT JOIN LATERAL (
          SELECT t.translation
          FROM dictionary_senses s
          JOIN dictionary_translations t ON t."senseId" = s.id
            AND t."targetLanguage" = 'vi'
            AND t.status IN (${RUNTIME_STATUS_LIST})
            AND t."isPrimary" = true
          WHERE s."entryId" = d.id
          ORDER BY s."usageRank" ASC, t.rank ASC
          LIMIT 1
        ) pt ON true
        ORDER BY
          CASE d.match_type
            WHEN 'exact' THEN 0
            WHEN 'alias' THEN 1
            ELSE 2
          END,
          d."frequencyRank" ASC
        LIMIT ${limit}
      `,
  );
}
