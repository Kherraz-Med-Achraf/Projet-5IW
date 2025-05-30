/*
  Warnings:

  - Added the required column `firstName` to the `StaffProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `StaffProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `StaffProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;
