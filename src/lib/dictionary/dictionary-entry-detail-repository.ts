import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db/client";
import { RUNTIME_STATUSES } from "./dictionary-dtos";

export type EntryDetailRow = Awaited<ReturnType<typeof findEntryById>>;

export async function findEntryById(
  entryId: string,
  sourceLanguage: string,
  targetLanguage: string = "vi",
) {
  return Sentry.startSpan(
    {
      name: "db:dictionary-entry-detail",
      op: "db",
      attributes: {
        "db.operation": "findUnique",
        "dictionary.entry_id": entryId,
      },
    },
    async () => {
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
    },
  );
}
