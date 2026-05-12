-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TEXT', 'PDF');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

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
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "simplifiedContent" TEXT,
    "originalLevel" "CEFRLevel",
    "simplifiedLevel" "CEFRLevel",
    "wordCount" INTEGER NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "fileUrl" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passageId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cardsReviewed" INTEGER NOT NULL DEFAULT 0,
    "newCards" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_stripeCustomerId_key" ON "profiles"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "passages_userId_idx" ON "passages"("userId");

-- CreateIndex
CREATE INDEX "passages_createdAt_idx" ON "passages"("createdAt");

-- CreateIndex
CREATE INDEX "passages_userId_deletedAt_idx" ON "passages"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "questions_passageId_idx" ON "questions"("passageId");

-- CreateIndex
CREATE INDEX "card_reviews_userId_nextReviewDate_idx" ON "card_reviews"("userId", "nextReviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "card_reviews_questionId_userId_key" ON "card_reviews"("questionId", "userId");

-- CreateIndex
CREATE INDEX "study_sessions_userId_startedAt_idx" ON "study_sessions"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
