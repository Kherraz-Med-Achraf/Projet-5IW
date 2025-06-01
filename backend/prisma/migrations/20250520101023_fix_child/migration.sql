/*
  Warnings:

  - You are about to drop the column `childProfileId` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_childProfileId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "childProfileId";
