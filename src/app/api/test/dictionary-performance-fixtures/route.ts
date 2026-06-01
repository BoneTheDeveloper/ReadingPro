import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { db } from "@/lib/db/client";

const cleanupSchema = z.object({
  dictionaryEntryIds: z.array(z.string()).default([]),
});

function isEnabled() {
  return process.env.DICTIONARY_PERFORMANCE_FIXTURES === "1" && process.env.NODE_ENV !== "production";
}

function disabledResponse() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      error: "Dictionary performance fixtures disabled.",
      requiredEnv: {
        DICTIONARY_PERFORMANCE_FIXTURES: "1",
      },
      currentEnv: {
        DICTIONARY_PERFORMANCE_FIXTURES: process.env.DICTIONARY_PERFORMANCE_FIXTURES ?? null,
        NODE_ENV: process.env.NODE_ENV ?? null,
      },
    },
    { status: 412 },
  );
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST() {
  if (!isEnabled()) {
    return disabledResponse();
  }

  await getAuthenticatedUser();
  const runId = Date.now().toString(36);
  const headword = `perfsuggest ${runId}`;
  const aliasHeadword = `perfalias target ${runId}`;
  const alias = `perfname ${runId}`;
  const miss = `perfmissing ${runId}`;

  const headwordEntry = await createDictionaryEntry({
    headword,
    translation: "goi y hieu nang",
    partOfSpeech: "noun",
  });
  const aliasEntry = await createDictionaryEntry({
    headword: aliasHeadword,
    translation: "bi danh hieu nang",
    partOfSpeech: "noun",
    alias,
  });

  return NextResponse.json({
    success: true,
    data: {
      headword,
      headwordPrefix: headword.slice(0, 8),
      aliasHeadword,
      alias,
      aliasPrefix: alias.slice(0, 8),
      miss,
      cleanup: {
        dictionaryEntryIds: [headwordEntry.id, aliasEntry.id],
      },
    },
  });
}

export async function DELETE(request: NextRequest) {
  if (!isEnabled()) {
    return disabledResponse();
  }

  await getAuthenticatedUser();
  const parsed = cleanupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cleanup request." }, { status: 400 });
  }

  if (parsed.data.dictionaryEntryIds.length > 0) {
    await db.dictionaryEntry.deleteMany({
      where: { id: { in: parsed.data.dictionaryEntryIds } },
    });
  }

  return NextResponse.json({ success: true });
}

function createDictionaryEntry(input: {
  headword: string;
  translation: string;
  partOfSpeech: string;
  alias?: string;
}) {
  return db.dictionaryEntry.create({
    data: {
      headword: input.headword,
      normalizedHeadword: normalizeTerm(input.headword),
      sourceLanguage: "en",
      frequencyRank: 0,
      senses: {
        create: {
          partOfSpeech: input.partOfSpeech,
          usageRank: 0,
          translations: {
            create: {
              targetLanguage: "vi",
              translation: input.translation,
              isPrimary: true,
              rank: 1,
              confidence: 1,
              status: "reviewed",
              sourceType: "seed",
              sourceName: "performance-test",
            },
          },
        },
      },
      aliases: input.alias
        ? {
            create: {
              normalizedAlias: normalizeTerm(input.alias),
              aliasType: "variant",
            },
          }
        : undefined,
    },
  });
}
