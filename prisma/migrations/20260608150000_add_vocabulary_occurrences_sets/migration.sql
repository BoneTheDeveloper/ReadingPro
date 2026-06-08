-- Migration: Restructure vocabulary_items for two-table vocabulary model
-- Per ADR 0005: VocabularyItem (word+meaning+review state) + VocabularyOccurrence (context)
--
-- Data preservation strategy:
-- 1. Add new columns to vocabulary_items
-- 2. Migrate data from old columns to new columns
-- 3. Collapse duplicate vocabulary_items (same word across passages) into single items
-- 4. Create vocabulary_occurrences from the collapsed rows
-- 5. Drop old columns and constraints

BEGIN;

-- ============================================
-- Step 1: Create new enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE "VocabularySetType" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Step 2: Add new columns to vocabulary_items
-- ============================================
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "normalizedText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "displayText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'TRANSLATE';
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "savedCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "nextReviewAt" TIMESTAMP(3);
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "lastReviewedAt" TIMESTAMP(3);
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "dictionaryEntryId" UUID;
ALTER TABLE "vocabulary_items" ADD COLUMN IF NOT EXISTS "dictionarySenseId" UUID;

-- Make "type" column NOT NULL (it was nullable before)
-- Default existing null values to 'WORD'
UPDATE "vocabulary_items" SET "type" = 'WORD' WHERE "type" IS NULL;
ALTER TABLE "vocabulary_items" ALTER COLUMN "type" SET NOT NULL;

-- ============================================
-- Step 3: Populate new columns from existing data
-- ============================================
-- normalizedText = lowercased, whitespace-normalized selectedText
-- displayText = original selectedText
UPDATE "vocabulary_items"
SET "normalizedText" = lower(trim(regexp_replace("selectedText", '\s+', ' ', 'g'))),
    "displayText" = "selectedText"
WHERE "normalizedText" = '';

-- ============================================
-- Step 4: Create vocabulary_occurrences table
-- ============================================
CREATE TABLE "vocabulary_occurrences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vocabularyItemId" UUID NOT NULL,
    "sourceId" UUID,
    "selectedText" TEXT NOT NULL,
    "contextSentence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_occurrences_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Step 5: Create occurrences from existing vocabulary_items
-- (Each existing row becomes an occurrence of its item)
-- ============================================
INSERT INTO "vocabulary_occurrences" ("vocabularyItemId", "sourceId", "selectedText", "contextSentence", "createdAt")
SELECT "id", "sourceId", "selectedText", "contextSentence", "createdAt"
FROM "vocabulary_items";

-- ============================================
-- Step 6: Collapse duplicate vocabulary_items
-- For rows sharing (userId, normalizedText, targetLanguage, translation):
-- - Keep the one with the most recent updatedAt
-- - Re-parent their occurrences to the survivor
-- - Increment savedCount on the survivor
-- - Delete the duplicate rows
-- ============================================

-- Materialize merge mapping in a temp table (needed across multiple statements)
CREATE TEMP TABLE "vocab_merge_map" AS
WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "userId", "normalizedText", "targetLanguage", "translation"
            ORDER BY "updatedAt" DESC, "createdAt" DESC
        ) AS rn,
        FIRST_VALUE("id") OVER (
            PARTITION BY "userId", "normalizedText", "targetLanguage", "translation"
            ORDER BY "updatedAt" DESC, "createdAt" DESC
        ) AS survivor_id
    FROM "vocabulary_items"
)
SELECT "id" AS merge_id, survivor_id
FROM ranked
WHERE rn > 1;

-- Re-parent occurrences from merged rows to their survivor items
UPDATE "vocabulary_occurrences" o
SET "vocabularyItemId" = m.survivor_id
FROM "vocab_merge_map" m
WHERE o."vocabularyItemId" = m.merge_id;

-- Increment savedCount on survivors by the number of merged rows
UPDATE "vocabulary_items" vi
SET "savedCount" = vi."savedCount" + COALESCE(mg.cnt, 0)
FROM (
    SELECT survivor_id, COUNT(*) AS cnt
    FROM "vocab_merge_map"
    GROUP BY survivor_id
) mg
WHERE vi."id" = mg.survivor_id;

-- Delete the merged (duplicate) rows
DELETE FROM "vocabulary_items"
WHERE "id" IN (SELECT merge_id FROM "vocab_merge_map");

-- Clean up temp table
DROP TABLE "vocab_merge_map";

-- ============================================
-- Step 7: Drop old columns and constraints from vocabulary_items
-- ============================================

-- Drop old foreign key to passages
ALTER TABLE "vocabulary_items" DROP CONSTRAINT IF EXISTS "vocabulary_items_sourceId_fkey";

-- Drop old unique constraint on normalizedKey
ALTER TABLE "vocabulary_items" DROP CONSTRAINT IF EXISTS "vocabulary_items_normalizedKey_key";

-- Drop old index
DROP INDEX IF EXISTS "vocabulary_items_userId_sourceId_createdAt_idx";

-- Drop old columns (selectedText migrated to normalizedText/displayText, contextSentence moved to occurrences)
ALTER TABLE "vocabulary_items" DROP COLUMN IF EXISTS "normalizedKey";
ALTER TABLE "vocabulary_items" DROP COLUMN IF EXISTS "sourceId";
ALTER TABLE "vocabulary_items" DROP COLUMN IF EXISTS "contextSentence";
ALTER TABLE "vocabulary_items" DROP COLUMN IF EXISTS "selectedText";

-- ============================================
-- Step 8: Add new constraints and indexes to vocabulary_items
-- ============================================

-- New unique constraint: (userId, normalizedText, targetLanguage, translation)
CREATE UNIQUE INDEX "vocabulary_items_userId_normalizedText_targetLanguage_translation_key"
    ON "vocabulary_items"("userId", "normalizedText", "targetLanguage", "translation");

-- New index: (userId, status)
CREATE INDEX "vocabulary_items_userId_status_idx"
    ON "vocabulary_items"("userId", "status");

-- New index: (userId, nextReviewAt)
CREATE INDEX "vocabulary_items_userId_nextReviewAt_idx"
    ON "vocabulary_items"("userId", "nextReviewAt");

-- ============================================
-- Step 9: Add constraints and indexes to vocabulary_occurrences
-- ============================================

-- Unique constraint on occurrence
CREATE UNIQUE INDEX "vocabulary_occurrences_vocabularyItemId_sourceId_contextSentence_key"
    ON "vocabulary_occurrences"("vocabularyItemId", "sourceId", "contextSentence");

-- Index for looking up occurrences by source
CREATE INDEX "vocabulary_occurrences_sourceId_idx"
    ON "vocabulary_occurrences"("sourceId");

-- Foreign key to vocabulary_items
ALTER TABLE "vocabulary_occurrences"
    ADD CONSTRAINT "vocabulary_occurrences_vocabularyItemId_fkey"
    FOREIGN KEY ("vocabularyItemId") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Step 10: Create vocabulary_sets table
-- ============================================
CREATE TABLE "vocabulary_sets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VocabularySetType" NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_sets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vocabulary_sets_userId_type_periodStart_periodEnd_key"
    ON "vocabulary_sets"("userId", "type", "periodStart", "periodEnd");

CREATE INDEX "vocabulary_sets_userId_type_idx"
    ON "vocabulary_sets"("userId", "type");

ALTER TABLE "vocabulary_sets"
    ADD CONSTRAINT "vocabulary_sets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Step 11: Create vocabulary_set_items table
-- ============================================
CREATE TABLE "vocabulary_set_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vocabularySetId" UUID NOT NULL,
    "vocabularyItemId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_set_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vocabulary_set_items_vocabularySetId_vocabularyItemId_key"
    ON "vocabulary_set_items"("vocabularySetId", "vocabularyItemId");

ALTER TABLE "vocabulary_set_items"
    ADD CONSTRAINT "vocabulary_set_items_vocabularySetId_fkey"
    FOREIGN KEY ("vocabularySetId") REFERENCES "vocabulary_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vocabulary_set_items"
    ADD CONSTRAINT "vocabulary_set_items_vocabularyItemId_fkey"
    FOREIGN KEY ("vocabularyItemId") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
