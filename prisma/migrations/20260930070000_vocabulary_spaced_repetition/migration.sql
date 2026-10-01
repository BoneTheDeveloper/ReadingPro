-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- DropIndex
DROP INDEX "VocabularyItem_userId_learningstatus_idx";

-- DropIndex
DROP INDEX "VocabularyItem_userId_nextReviewAt_idx";

-- DropIndex
DROP INDEX "VocabularySet_userId_type_idx";

-- DropIndex
DROP INDEX "VocabularySet_userId_type_periodStart_periodEnd_key";

-- DropIndex
DROP INDEX "VocabularySetItem_vocabularySetId_vocabularyItemId_key";

-- ReplaceEnum
-- The old status (NEW / LEARNING / MEMORIZED) was edited by hand and carries no
-- schedule, so every word restarts as NEW under the scheduler-owned status.
ALTER TABLE "VocabularyItem" DROP COLUMN "learningstatus";
DROP TYPE "VocabularyStatus";
CREATE TYPE "VocabularyStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "dailyNewLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "desiredRetention" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
ADD COLUMN     "fsrsParams" JSONB,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok';

-- AlterTable
ALTER TABLE "VocabularyItem" DROP COLUMN "lastReviewedAt",
DROP COLUMN "nextReviewAt",
ADD COLUMN     "contextSentence" TEXT,
ADD COLUMN     "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lapses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastReviewAt" TIMESTAMP(3),
ADD COLUMN     "learningSteps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passageId" UUID,
ADD COLUMN     "reps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" "VocabularyStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "VocabularySet" DROP COLUMN "periodEnd",
DROP COLUMN "periodStart",
DROP COLUMN "type",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "VocabularySetItem" DROP CONSTRAINT "VocabularySetItem_pkey",
DROP COLUMN "addedAt",
DROP COLUMN "id",
ADD CONSTRAINT "VocabularySetItem_pkey" PRIMARY KEY ("vocabularySetId", "vocabularyItemId");

-- DropEnum
DROP TYPE "VocabularySetType";

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "vocabularySetId" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "cardsReviewed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "vocabularyItemId" UUID NOT NULL,
    "sessionId" UUID,
    "clientReviewId" UUID NOT NULL,
    "rating" "ReviewRating" NOT NULL,
    "status" "VocabularyStatus" NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "elapsedDays" INTEGER NOT NULL,
    "scheduledDays" INTEGER NOT NULL,
    "learningSteps" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewSession_userId_startedAt_idx" ON "ReviewSession"("userId", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewLog_clientReviewId_key" ON "ReviewLog"("clientReviewId");

-- CreateIndex
CREATE INDEX "ReviewLog_vocabularyItemId_reviewedAt_idx" ON "ReviewLog"("vocabularyItemId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "VocabularyItem_userId_dueAt_idx" ON "VocabularyItem"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "VocabularyItem_userId_status_idx" ON "VocabularyItem"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularySet_userId_name_key" ON "VocabularySet"("userId", "name");

-- CreateIndex
CREATE INDEX "VocabularySetItem_vocabularyItemId_idx" ON "VocabularySetItem"("vocabularyItemId");

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_vocabularySetId_fkey" FOREIGN KEY ("vocabularySetId") REFERENCES "VocabularySet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "VocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReviewSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

