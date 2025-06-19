-- CreateEnum
CREATE TYPE "JustificationType" AS ENUM ('ABSENCE', 'LATENESS');

-- AlterTable
ALTER TABLE "AbsenceJustification" ADD COLUMN     "type" "JustificationType" NOT NULL DEFAULT 'ABSENCE';
