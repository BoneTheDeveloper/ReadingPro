/*
  Warnings:

  - You are about to drop the `question_reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quiz_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "question_reviews" DROP CONSTRAINT "question_reviews_questionId_fkey";

-- DropForeignKey
ALTER TABLE "question_reviews" DROP CONSTRAINT "question_reviews_userId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_attempts" DROP CONSTRAINT "quiz_attempts_passageId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_attempts" DROP CONSTRAINT "quiz_attempts_studySessionId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_attempts" DROP CONSTRAINT "quiz_attempts_userId_fkey";

-- DropTable
DROP TABLE "question_reviews";

-- DropTable
DROP TABLE "quiz_attempts";

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artifactId" UUID NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctCount" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "accuracyRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_results_artifactId_key" ON "quiz_results"("artifactId");

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "studio_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
