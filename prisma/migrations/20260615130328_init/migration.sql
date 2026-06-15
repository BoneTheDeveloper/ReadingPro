-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TEXT', 'PDF');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "VocabularySetType" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "targetLevel" "CEFRLevel" NOT NULL DEFAULT 'B2',
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "simplifiedContent" TEXT,
    "originalLevel" "CEFRLevel",
    "simplifiedLevel" "CEFRLevel",
    "wordCount" INTEGER NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "filePath" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "passageId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "headword" TEXT NOT NULL,
    "normalizedHeadword" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "frequencyRank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary_senses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entryId" UUID NOT NULL,
    "partOfSpeech" TEXT,
    "definition" TEXT,
    "example" TEXT,
    "tags" TEXT[],
    "usageRank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_senses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "senseId" UUID NOT NULL,
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

-- CreateTable
CREATE TABLE "dictionary_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entryId" UUID NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "aliasType" TEXT NOT NULL DEFAULT 'variant',

    CONSTRAINT "dictionary_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary_source_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batchName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_source_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_caches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cacheKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
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

-- CreateTable
CREATE TABLE "translation_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
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

-- CreateTable
CREATE TABLE "vocabulary_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'WORD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "normalizedText" TEXT NOT NULL DEFAULT '',
    "displayText" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'TRANSLATE',
    "savedCount" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "dictionaryEntryId" UUID,
    "dictionarySenseId" UUID,

    CONSTRAINT "vocabulary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_occurrences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vocabularyItemId" UUID NOT NULL,
    "sourceId" UUID,
    "selectedText" TEXT NOT NULL,
    "contextSentence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "vocabulary_set_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vocabularySetId" UUID NOT NULL,
    "vocabularyItemId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_set_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passageId" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "sourceLine" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "qualityRating" INTEGER NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studySessionId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "passageId" UUID,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_upload_intents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_upload_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_stripeCustomerId_key" ON "profiles"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "passages_filePath_key" ON "passages"("filePath");

-- CreateIndex
CREATE INDEX "passages_userId_idx" ON "passages"("userId");

-- CreateIndex
CREATE INDEX "passages_createdAt_idx" ON "passages"("createdAt");

-- CreateIndex
CREATE INDEX "passages_userId_deletedAt_idx" ON "passages"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "study_chat_messages_userId_passageId_createdAt_idx" ON "study_chat_messages"("userId", "passageId", "createdAt");

-- CreateIndex
CREATE INDEX "dictionary_entries_sourceLanguage_frequencyRank_idx" ON "dictionary_entries"("sourceLanguage", "frequencyRank");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_entries_normalizedHeadword_sourceLanguage_key" ON "dictionary_entries"("normalizedHeadword", "sourceLanguage");

-- CreateIndex
CREATE INDEX "dictionary_senses_entryId_usageRank_idx" ON "dictionary_senses"("entryId", "usageRank");

-- CreateIndex
CREATE INDEX "dictionary_translations_senseId_targetLanguage_status_isPri_idx" ON "dictionary_translations"("senseId", "targetLanguage", "status", "isPrimary");

-- CreateIndex
CREATE INDEX "dictionary_translations_targetLanguage_status_rank_idx" ON "dictionary_translations"("targetLanguage", "status", "rank");

-- CreateIndex
CREATE INDEX "dictionary_aliases_normalizedAlias_idx" ON "dictionary_aliases"("normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_aliases_normalizedAlias_entryId_key" ON "dictionary_aliases"("normalizedAlias", "entryId");

-- CreateIndex
CREATE INDEX "dictionary_source_audits_batchName_idx" ON "dictionary_source_audits"("batchName");

-- CreateIndex
CREATE INDEX "dictionary_source_audits_entityType_entityId_idx" ON "dictionary_source_audits"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "translation_caches_cacheKey_key" ON "translation_caches"("cacheKey");

-- CreateIndex
CREATE INDEX "translation_caches_userId_sourceId_targetLanguage_idx" ON "translation_caches"("userId", "sourceId", "targetLanguage");

-- CreateIndex
CREATE INDEX "translation_caches_userId_createdAt_idx" ON "translation_caches"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "translation_histories_userId_sourceId_createdAt_idx" ON "translation_histories"("userId", "sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "vocabulary_items_userId_nextReviewAt_idx" ON "vocabulary_items"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "vocabulary_items_userId_status_idx" ON "vocabulary_items"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_items_userId_normalizedText_targetLanguage_trans_key" ON "vocabulary_items"("userId", "normalizedText", "targetLanguage", "translation");

-- CreateIndex
CREATE INDEX "vocabulary_occurrences_sourceId_idx" ON "vocabulary_occurrences"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_occurrences_vocabularyItemId_sourceId_contextSen_key" ON "vocabulary_occurrences"("vocabularyItemId", "sourceId", "contextSentence");

-- CreateIndex
CREATE INDEX "vocabulary_sets_userId_type_idx" ON "vocabulary_sets"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_sets_userId_type_periodStart_periodEnd_key" ON "vocabulary_sets"("userId", "type", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_set_items_vocabularySetId_vocabularyItemId_key" ON "vocabulary_set_items"("vocabularySetId", "vocabularyItemId");

-- CreateIndex
CREATE INDEX "questions_passageId_idx" ON "questions"("passageId");

-- CreateIndex
CREATE INDEX "card_reviews_userId_nextReviewDate_idx" ON "card_reviews"("userId", "nextReviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "card_reviews_questionId_userId_key" ON "card_reviews"("questionId", "userId");

-- CreateIndex
CREATE INDEX "study_sessions_userId_startedAt_idx" ON "study_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "study_sessions_userId_completedAt_idx" ON "study_sessions"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "study_sessions_userId_lastSeenAt_idx" ON "study_sessions"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_startedAt_idx" ON "quiz_attempts"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "file_upload_intents_pathname_key" ON "file_upload_intents"("pathname");

-- CreateIndex
CREATE INDEX "file_upload_intents_expiresAt_idx" ON "file_upload_intents"("expiresAt");

-- CreateIndex
CREATE INDEX "file_upload_intents_userId_expiresAt_idx" ON "file_upload_intents"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_chat_messages" ADD CONSTRAINT "study_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_chat_messages" ADD CONSTRAINT "study_chat_messages_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary_senses" ADD CONSTRAINT "dictionary_senses_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "dictionary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary_translations" ADD CONSTRAINT "dictionary_translations_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "dictionary_senses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary_aliases" ADD CONSTRAINT "dictionary_aliases_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "dictionary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_caches" ADD CONSTRAINT "translation_caches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_caches" ADD CONSTRAINT "translation_caches_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_histories" ADD CONSTRAINT "translation_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_histories" ADD CONSTRAINT "translation_histories_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_items" ADD CONSTRAINT "vocabulary_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_occurrences" ADD CONSTRAINT "vocabulary_occurrences_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_sets" ADD CONSTRAINT "vocabulary_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_set_items" ADD CONSTRAINT "vocabulary_set_items_vocabularySetId_fkey" FOREIGN KEY ("vocabularySetId") REFERENCES "vocabulary_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_set_items" ADD CONSTRAINT "vocabulary_set_items_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_upload_intents" ADD CONSTRAINT "file_upload_intents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
