/*
  Warnings:

  - Added the required column `birthDate` to the `SecretaryProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `SecretaryProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `SecretaryProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `SecretaryProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SecretaryProfile" ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;
