---
phase: 1
title: "Dictionary data: schema, parser, import"
status: pending
priority: P1
effort: "1d"
dependencies: []
---

# Phase 1: Dictionary data: schema, parser, import

## Goal

Load the Hồ Ngọc Đức / OVDP English-Vietnamese dictionary into a
`"DictionaryEntry"` table with a repeatable import, and add the
`"WordLookup"` table that phase 2 writes to.

## Files to Create / Modify

- Create: `db/migrations/V3__dictionary_and_word_lookup.sql`
- Create: `db/dictionary/anhviet.txt.gz` (source file, committed) and
  `db/dictionary/SOURCE.txt` (origin URL, license, sha256, retrieval date)
- Create: `src/server/modules/dictionary/ovdp-parser.ts`. It must import
  only relative paths and no `@/` alias, so the script can run it under plain
  Node.
- Create: `src/server/modules/dictionary/ovdp-parser.test.ts`
- Create: `src/shared/dictionary/schema.ts` (zod schemas for `DictionarySense`
  and `DictionaryEntry`)
- Create: `scripts/import-dictionary.ts`
- Modify: `package.json` (add a `db:import-dictionary` script), `tsconfig.json`
  (only if the script's `.ts` import needs `allowImportingTsExtensions`)

## Tasks & Steps

1. **Get and verify the source.**
   - Download the OVDP English-Vietnamese file. Candidates are the
     SourceForge `ovdp` project and Hồ Ngọc Đức's Leipzig page (links in
     `SOURCE.txt`).
   - Confirm that the license text in the distribution (GPL expected) allows
     redistributing the data inside this repository with credit. If it does
     not, stop and report back before going further.
   - Record the URL, license, sha256 and date in `SOURCE.txt`.
   - Commit the gzip file only if it is under 10 MB. Otherwise make the script
     download from the pinned URL and check the sha256.
2. **Confirm the format against the real file** before writing the parser. The
   expected format is:
   - `@headword /phonetic/` starts an entry.
   - `* <loại từ>` starts a sense group.
   - `- meaning` is one meaning in the current group.
   - `=example+ translation` is an example of the previous meaning.
   - `!idiom` starts an idiom, and its meanings follow as `-` lines.
3. **Migration `V3__dictionary_and_word_lookup.sql`** (back up the local
   database with `pg_dump` first):
   ```sql
   CREATE TABLE "DictionaryEntry" (
       -- Lowercased lookup key; case variants of one word are merged into one row.
       "headword" TEXT NOT NULL,
       "displayHeadword" TEXT NOT NULL,
       "phonetic" TEXT,
       -- [{ "label": "ngoại động từ", "partOfSpeech": "VERB",
       --    "meanings": [{ "text": "...", "examples": [{ "en": "...", "vi": "..." }] }] }]
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
   ```
4. **Parser `ovdp-parser.ts`.** `parseOvdp(lines: Iterable<string>): DictionaryEntry[]`.
   - Map the Vietnamese part-of-speech label to the `PartOfSpeech` enum and
     keep the raw label:
     - `danh từ` becomes `NOUN`.
     - `động từ`, `nội động từ`, `ngoại động từ` and `trợ động từ` become
       `VERB`.
     - `tính từ` becomes `ADJECTIVE`.
     - `phó từ` and `trạng từ` become `ADVERB`.
     - `giới từ` becomes `PREPOSITION`.
     - `liên từ` becomes `CONJUNCTION`.
     - `!` idiom groups become `PHRASE`.
     - Everything else becomes `OTHER`.
   - Merge entries whose lowercased headword collides by concatenating their
     senses.
   - Trim whitespace and skip empty meanings.
   - Import the enum values relatively from `src/shared/enums.ts`, which has
     no imports of its own.
5. **Import script.** `node --env-file-if-exists=.env scripts/import-dictionary.ts [file]`:
   - Connect with `resolveDatabaseUrl` (relative import).
   - Stream the gunzipped file through the parser.
   - In one transaction, `TRUNCATE "DictionaryEntry"`, then insert in batches
     of 1000 using `unnest($1::text[], $2::text[], $3::text[], $4::jsonb[])`.
   - Print the entry count.
   - Wire it as `pnpm db:import-dictionary`.
   - Production: back up with `pg_dump`, then run the script with
     `DATABASE_URL` set to the production database.
6. **Parser tests.** Cover one multi-group entry with examples, one idiom,
   one case collision and the mapping of an unknown label to `OTHER`. Use
   inline sample lines copied from the real file.

## Verification

- `pnpm db:migrate`, then `pnpm db:info` shows V3 applied.
- `pnpm db:import-dictionary` prints about 100k entries, and running it twice
  gives the same count.
- `psql`: `SELECT "senses" FROM "DictionaryEntry" WHERE "headword" = 'run'`
  returns grouped senses.
- `pnpm test src/server/modules/dictionary/ovdp-parser.test.ts`
- `pnpm typecheck && pnpm lint`
- `src/server/lib/enum-sync.test.ts` still passes. No new Postgres enum is
  added; `partOfSpeech` lives inside JSONB.

## Risks / Rollback

- If the file format deviates, adjust the parser to the real lines from step 2.
- Rollback for local: `pnpm db:down -v && pnpm db:up`, which is safe because
  V3 has only run locally.
