/*
  Warnings:

  - You are about to drop the column `jobTitle` on the `SecretaryProfile` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Child` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specialty` to the `SecretaryProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('EDUCATOR', 'TECH_EDUCATOR', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'ORTHOPEDIST');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DirectorProfile" ADD COLUMN     "specialty" TEXT;

-- AlterTable
ALTER TABLE "SecretaryProfile" DROP COLUMN "jobTitle",
ADD COLUMN     "specialty" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ServiceManagerProfile" ADD COLUMN     "specialty" TEXT;

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "specialty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChildReferents" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChildReferents_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE INDEX "_ChildReferents_B_index" ON "_ChildReferents"("B");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChildReferents" ADD CONSTRAINT "_ChildReferents_A_fkey" FOREIGN KEY ("A") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChildReferents" ADD CONSTRAINT "_ChildReferents_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
