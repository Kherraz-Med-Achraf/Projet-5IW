/*
  Warnings:

  - Added the required column `birthDate` to the `StaffProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL;
