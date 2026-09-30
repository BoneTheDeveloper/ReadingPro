-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TEXT', 'PDF', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "VocabularySetType" AS ENUM ('MANUAL', 'GENARATED', 'DEFAULT');

-- CreateEnum
CREATE TYPE "VocabularyStatus" AS ENUM ('NEW', 'LEARNING', 'MEMORIZED');

-- CreateEnum
CREATE TYPE "StudioArtifactType" AS ENUM ('QUESTION', 'FLASHCARD');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PREPOSITION', 'CONJUNCTION', 'PHRASE', 'OTHER');

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tier" TEXT DEFAULT 'FREE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "cefrLevel" "CEFRLevel",
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "sourceType" "SourceType" NOT NULL,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "youtubeUrl" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioArtifact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passageId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StudioArtifactType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB,
    "progress" JSONB,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "StudioArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "passageId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "partofSpeech" "PartOfSpeech" NOT NULL,
    "savedCount" INTEGER NOT NULL DEFAULT 1,
    "learningstatus" "VocabularyStatus" NOT NULL DEFAULT 'NEW',
    "nextReviewAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularySetItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vocabularySetId" UUID NOT NULL,
    "vocabularyItemId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularySetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularySet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VocabularySetType" NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularySet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Passage_filePath_key" ON "Passage"("filePath");

-- CreateIndex
CREATE INDEX "Passage_createdAt_idx" ON "Passage"("createdAt");

-- CreateIndex
CREATE INDEX "Passage_userId_idx" ON "Passage"("userId");

-- CreateIndex
CREATE INDEX "Passage_status_idx" ON "Passage"("status");

-- CreateIndex
CREATE INDEX "StudioArtifact_passageId_createdAt_idx" ON "StudioArtifact"("passageId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StudioArtifact_userId_createdAt_idx" ON "StudioArtifact"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StudioArtifact_status_idx" ON "StudioArtifact"("status");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_passageId_createdAt_idx" ON "ChatMessage"("userId", "passageId", "createdAt");

-- CreateIndex
CREATE INDEX "VocabularyItem_userId_nextReviewAt_idx" ON "VocabularyItem"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "VocabularyItem_userId_learningstatus_idx" ON "VocabularyItem"("userId", "learningstatus");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyItem_userId_term_translation_key" ON "VocabularyItem"("userId", "term", "translation");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularySetItem_vocabularySetId_vocabularyItemId_key" ON "VocabularySetItem"("vocabularySetId", "vocabularyItemId");

-- CreateIndex
CREATE INDEX "VocabularySet_userId_type_idx" ON "VocabularySet"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularySet_userId_type_periodStart_periodEnd_key" ON "VocabularySet"("userId", "type", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passage" ADD CONSTRAINT "Passage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioArtifact" ADD CONSTRAINT "StudioArtifact_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularySetItem" ADD CONSTRAINT "VocabularySetItem_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "VocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularySetItem" ADD CONSTRAINT "VocabularySetItem_vocabularySetId_fkey" FOREIGN KEY ("vocabularySetId") REFERENCES "VocabularySet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularySet" ADD CONSTRAINT "VocabularySet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

