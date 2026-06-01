-- DropOldDictionary
DROP TABLE IF EXISTS "dictionary_entries" CASCADE;

-- CreateTable:DictionaryEntry
CREATE TABLE "dictionary_entries" (
    "id" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "normalizedHeadword" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "frequencyRank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable:DictionarySense
CREATE TABLE "dictionary_senses" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "definition" TEXT,
    "example" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageRank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_senses_pkey" PRIMARY KEY ("id")
);

-- CreateTable:DictionaryTranslation
CREATE TABLE "dictionary_translations" (
    "id" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL DEFAULT 'vi',
    "translation" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable:DictionaryAlias
CREATE TABLE "dictionary_aliases" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "aliasType" TEXT NOT NULL DEFAULT 'variant',

    CONSTRAINT "dictionary_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable:DictionarySourceAudit
CREATE TABLE "dictionary_source_audits" (
    "id" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_source_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_entries_normalizedHeadword_sourceLanguage_key" ON "dictionary_entries"("normalizedHeadword", "sourceLanguage");

-- CreateIndex
CREATE INDEX "dictionary_entries_sourceLanguage_frequencyRank_idx" ON "dictionary_entries"("sourceLanguage", "frequencyRank");

-- CreateIndex
CREATE INDEX "dictionary_senses_entryId_usageRank_idx" ON "dictionary_senses"("entryId", "usageRank");

-- CreateIndex
CREATE INDEX "dictionary_translations_senseId_targetLanguage_status_isPrimary_idx" ON "dictionary_translations"("senseId", "targetLanguage", "status", "isPrimary");

-- CreateIndex
CREATE INDEX "dictionary_translations_targetLanguage_status_rank_idx" ON "dictionary_translations"("targetLanguage", "status", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_aliases_normalizedAlias_entryId_key" ON "dictionary_aliases"("normalizedAlias", "entryId");

-- CreateIndex
CREATE INDEX "dictionary_aliases_normalizedAlias_idx" ON "dictionary_aliases"("normalizedAlias");

-- CreateIndex
CREATE INDEX "dictionary_source_audits_batchName_idx" ON "dictionary_source_audits"("batchName");

-- CreateIndex
CREATE INDEX "dictionary_source_audits_entityType_entityId_idx" ON "dictionary_source_audits"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "dictionary_senses" ADD CONSTRAINT "dictionary_senses_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "dictionary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary_translations" ADD CONSTRAINT "dictionary_translations_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "dictionary_senses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary_aliases" ADD CONSTRAINT "dictionary_aliases_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "dictionary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
