CREATE TABLE "dictionary_entries" (
    "id" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "type" TEXT,
    "pronunciation" TEXT,
    "meanings" JSONB,
    "examples" JSONB,
    "relatedWords" JSONB,
    "source" TEXT NOT NULL DEFAULT 'local',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_caches" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "contextSentence" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_caches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "contextSentence" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vocabulary_items" (
    "id" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "contextSentence" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dictionary_entries_normalizedKey_key" ON "dictionary_entries"("normalizedKey");
CREATE INDEX "dictionary_entries_sourceLanguage_targetLanguage_normalizedTerm_idx" ON "dictionary_entries"("sourceLanguage", "targetLanguage", "normalizedTerm");

CREATE UNIQUE INDEX "translation_caches_cacheKey_key" ON "translation_caches"("cacheKey");
CREATE INDEX "translation_caches_userId_sourceId_targetLanguage_idx" ON "translation_caches"("userId", "sourceId", "targetLanguage");
CREATE INDEX "translation_caches_userId_createdAt_idx" ON "translation_caches"("userId", "createdAt");

CREATE INDEX "translation_histories_userId_sourceId_createdAt_idx" ON "translation_histories"("userId", "sourceId", "createdAt");

CREATE UNIQUE INDEX "vocabulary_items_normalizedKey_key" ON "vocabulary_items"("normalizedKey");
CREATE INDEX "vocabulary_items_userId_sourceId_createdAt_idx" ON "vocabulary_items"("userId", "sourceId", "createdAt");

ALTER TABLE "translation_caches" ADD CONSTRAINT "translation_caches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_caches" ADD CONSTRAINT "translation_caches_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "translation_histories" ADD CONSTRAINT "translation_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_histories" ADD CONSTRAINT "translation_histories_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vocabulary_items" ADD CONSTRAINT "vocabulary_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vocabulary_items" ADD CONSTRAINT "vocabulary_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
