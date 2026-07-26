/*
  Warnings:

  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "file_upload_intents" DROP CONSTRAINT "file_upload_intents_userId_fkey";

-- DropForeignKey
ALTER TABLE "passages" DROP CONSTRAINT "passages_userId_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_id_fkey";

-- DropForeignKey
ALTER TABLE "studio_artifacts" DROP CONSTRAINT "studio_artifacts_userId_fkey";

-- DropForeignKey
ALTER TABLE "study_chat_messages" DROP CONSTRAINT "study_chat_messages_userId_fkey";

-- DropForeignKey
ALTER TABLE "upload_jobs" DROP CONSTRAINT "upload_jobs_userId_fkey";

-- DropForeignKey
ALTER TABLE "vocabulary_items" DROP CONSTRAINT "vocabulary_items_userId_fkey";

-- DropForeignKey
ALTER TABLE "vocabulary_sets" DROP CONSTRAINT "vocabulary_sets_userId_fkey";

-- DropTable
DROP TABLE "profiles";

-- CreateTable
CREATE TABLE "userProfile" (
    "id" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "userProfile" ADD CONSTRAINT "userProfile_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_upload_intents" ADD CONSTRAINT "file_upload_intents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_artifacts" ADD CONSTRAINT "studio_artifacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_chat_messages" ADD CONSTRAINT "study_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_items" ADD CONSTRAINT "vocabulary_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_sets" ADD CONSTRAINT "vocabulary_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
