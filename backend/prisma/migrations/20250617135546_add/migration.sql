/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Child` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Child" DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "activity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryChild" (
    "entryId" TEXT NOT NULL,
    "childId" INTEGER NOT NULL,

    CONSTRAINT "EntryChild_pkey" PRIMARY KEY ("entryId","childId")
);

-- CreateIndex
CREATE INDEX "ScheduleEntry_staffId_idx" ON "ScheduleEntry"("staffId");

-- CreateIndex
CREATE INDEX "ScheduleEntry_semesterId_idx" ON "ScheduleEntry"("semesterId");

-- CreateIndex
CREATE INDEX "EntryChild_childId_idx" ON "EntryChild"("childId");

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryChild" ADD CONSTRAINT "EntryChild_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ScheduleEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryChild" ADD CONSTRAINT "EntryChild_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
