-- English-Vietnamese dictionary and the per-passage word lookup history.
--
-- "DictionaryEntry" is filled by `pnpm db:import-dictionary` from
-- db/dictionary/AnhViet.zip; a reimport truncates it and loads it again.

CREATE TABLE "DictionaryEntry" (
    -- Lowercased lookup key; case variants of one word are merged into one row.
    "headword" TEXT NOT NULL,
    "displayHeadword" TEXT NOT NULL,
    "phonetic" TEXT,
    -- [{ "kind": "word", "label": "ngoại động từ", "partOfSpeech": "VERB",
    --    "meanings": [{ "text": "...", "examples": [{ "en": "...", "vi": "..." }] }] }]
    -- See src/shared/dictionary/schema.ts.
    "senses" JSONB NOT NULL,
    CONSTRAINT "DictionaryEntry_pkey" PRIMARY KEY ("headword")
);

-- One row per word per passage; a repeat lookup moves it to the top.
-- No FK to "DictionaryEntry": a reimport truncates that table.
CREATE TABLE "WordLookup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "passageId" UUID NOT NULL,
    "headword" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "contextSentence" TEXT,
    "lookedUpAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WordLookup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WordLookup_passageId_headword_key" ON "WordLookup"("passageId", "headword");
CREATE INDEX "WordLookup_userId_passageId_lookedUpAt_idx"
    ON "WordLookup"("userId", "passageId", "lookedUpAt" DESC);

ALTER TABLE "WordLookup" ADD CONSTRAINT "WordLookup_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordLookup" ADD CONSTRAINT "WordLookup_passageId_fkey"
    FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
