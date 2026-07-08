/*
  Warnings:

  - You are about to drop the column `originalLevel` on the `passages` table. All the data in the column will be lost.
  - You are about to drop the column `simplifiedContent` on the `passages` table. All the data in the column will be lost.
  - You are about to drop the column `simplifiedLevel` on the `passages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "passages" DROP COLUMN "originalLevel",
DROP COLUMN "simplifiedContent",
DROP COLUMN "simplifiedLevel",
ADD COLUMN     "cefrLevel" "CEFRLevel";
