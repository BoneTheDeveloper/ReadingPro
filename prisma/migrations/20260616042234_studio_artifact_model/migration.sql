-- CreateTable
CREATE TABLE "studio_artifacts" (
    "id" UUID NOT NULL,
    "passageId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_artifacts_passageId_createdAt_idx" ON "studio_artifacts"("passageId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "studio_artifacts_userId_idx" ON "studio_artifacts"("userId");

-- AddForeignKey
ALTER TABLE "studio_artifacts" ADD CONSTRAINT "studio_artifacts_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_artifacts" ADD CONSTRAINT "studio_artifacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Wipe existing questions (dev data) so NOT NULL artifactId can be added
DELETE FROM "question_reviews";
DELETE FROM "questions";

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "artifactId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "questions_artifactId_idx" ON "questions"("artifactId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "studio_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
