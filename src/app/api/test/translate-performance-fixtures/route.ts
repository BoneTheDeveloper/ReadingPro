import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { db } from "@/lib/db/client";
import { countWords } from "@/lib/translation/translate-performance";

const cleanupSchema = z.object({
  passageIds: z.array(z.string()).default([]),
  dictionaryEntryIds: z.array(z.string()).default([]),
});

function isEnabled() {
  // TRANSLATE_PERFORMANCE_FIXTURES enables benchmark-only fixture writes.
  // The NODE_ENV guard keeps this diagnostic route unavailable in production.
  return process.env.TRANSLATE_PERFORMANCE_FIXTURES === "1" && process.env.NODE_ENV !== "production";
}

function disabledResponse() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      error: "Translate performance fixtures disabled.",
      requiredEnv: {
        TRANSLATE_PERFORMANCE_FIXTURES: "1",
      },
      currentEnv: {
        TRANSLATE_PERFORMANCE_FIXTURES: process.env.TRANSLATE_PERFORMANCE_FIXTURES ?? null,
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

  const user = await getAuthenticatedUser();
  const runId = Date.now().toString(36);
  const singleWord = `perfword${runId}`;
  const phrase = `perf phrase ${runId}`;
  const fallbackText = `unknown${runId}`;
  const context = [
    "Readers first review background vocabulary before the target term appears.",
    `The passage then compares ${singleWord} with ${phrase} during translation.`,
    `A final sentence contains ${fallbackText} for fallback coverage.`,
  ].join(" ");

  const passage = await db.passage.create({
    data: {
      userId: user.id,
      title: `Translate performance ${runId}`,
      content: context,
      originalLevel: "B2",
      wordCount: countWords(context),
      sourceType: "TEXT",
    },
  });

  const singleWordEntry = await createDictionaryEntry(singleWord, "tu hieu nang", "noun");
  const phraseEntry = await createDictionaryEntry(phrase, "cum tu hieu nang", "noun phrase");

  return NextResponse.json({
    success: true,
    data: {
      passageId: passage.id,
      singleWord,
      phrase,
      fallbackText,
      context,
      cleanup: {
        passageIds: [passage.id],
        dictionaryEntryIds: [singleWordEntry.id, phraseEntry.id],
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

  if (parsed.data.passageIds.length > 0) {
    await db.passage.deleteMany({ where: { id: { in: parsed.data.passageIds } } });
  }
  if (parsed.data.dictionaryEntryIds.length > 0) {
    await db.dictionaryEntry.deleteMany({ where: { id: { in: parsed.data.dictionaryEntryIds } } });
  }

  return NextResponse.json({ success: true });
}

function createDictionaryEntry(headword: string, translation: string, partOfSpeech: string) {
  return db.dictionaryEntry.create({
    data: {
      headword,
      normalizedHeadword: normalizeTerm(headword),
      sourceLanguage: "en",
      frequencyRank: 0,
      senses: {
        create: {
          partOfSpeech,
          usageRank: 0,
          translations: {
            create: {
              targetLanguage: "vi",
              translation,
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
    },
  });
}
