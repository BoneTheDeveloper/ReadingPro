-- A word now belongs to exactly one set. Words the user has not filed go to a
-- per-user default set. The daily new-word limit moves from the user to the set.

ALTER TABLE "VocabularySet" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- A set already carrying the default name becomes the default set.
UPDATE "VocabularySet" SET "isDefault" = true WHERE "name" = 'Mặc định';

INSERT INTO "VocabularySet" ("userId", "name", "isDefault")
SELECT p."id", 'Mặc định', true
FROM "UserProfile" p
WHERE NOT EXISTS (
  SELECT 1 FROM "VocabularySet" s WHERE s."userId" = p."id" AND s."isDefault"
);

ALTER TABLE "VocabularyItem" ADD COLUMN "vocabularySetId" UUID;

-- A word that was in several sets stays in the oldest of them.
UPDATE "VocabularyItem" i
SET "vocabularySetId" = (
  SELECT si."vocabularySetId"
  FROM "VocabularySetItem" si
  JOIN "VocabularySet" s ON s."id" = si."vocabularySetId"
  WHERE si."vocabularyItemId" = i."id"
  ORDER BY s."createdAt" ASC
  LIMIT 1
);

UPDATE "VocabularyItem" i
SET "vocabularySetId" = s."id"
FROM "VocabularySet" s
WHERE i."vocabularySetId" IS NULL AND s."userId" = i."userId" AND s."isDefault";

ALTER TABLE "VocabularyItem" ALTER COLUMN "vocabularySetId" SET NOT NULL;

ALTER TABLE "VocabularyItem"
  ADD CONSTRAINT "VocabularyItem_vocabularySetId_fkey"
  FOREIGN KEY ("vocabularySetId") REFERENCES "VocabularySet"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "VocabularyItem_vocabularySetId_idx" ON "VocabularyItem"("vocabularySetId");

DROP TABLE "VocabularySetItem";

-- Every set starts from the limit its owner had.
ALTER TABLE "VocabularySet" ADD COLUMN "dailyNewLimit" INTEGER NOT NULL DEFAULT 10;

UPDATE "VocabularySet" s
SET "dailyNewLimit" = p."dailyNewLimit"
FROM "UserProfile" p
WHERE p."id" = s."userId";

ALTER TABLE "UserProfile" DROP COLUMN "dailyNewLimit";
