-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('PENDING_STAFF', 'PENDING_SECRETARY', 'VALIDATED');

-- CreateTable
CREATE TABLE "PresenceSheet" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "staffId" TEXT NOT NULL,
    "validatedAtStaff" TIMESTAMP(3),
    "validatedBySecretary" BOOLEAN NOT NULL DEFAULT false,
    "validatedAtSecretary" TIMESTAMP(3),
    "status" "PresenceStatus" NOT NULL DEFAULT 'PENDING_STAFF',

    CONSTRAINT "PresenceSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceRecord" (
    "id" SERIAL NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "present" BOOLEAN NOT NULL,

    CONSTRAINT "PresenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceJustification" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "justificationDate" TIMESTAMP(3) NOT NULL,
    "motif" TEXT NOT NULL,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceJustification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PresenceSheet_date_key" ON "PresenceSheet"("date");

-- CreateIndex
CREATE INDEX "PresenceSheet_date_idx" ON "PresenceSheet"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PresenceRecord_sheetId_childId_key" ON "PresenceRecord"("sheetId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceJustification_recordId_key" ON "AbsenceJustification"("recordId");

-- AddForeignKey
ALTER TABLE "PresenceRecord" ADD CONSTRAINT "PresenceRecord_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "PresenceSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceRecord" ADD CONSTRAINT "PresenceRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceJustification" ADD CONSTRAINT "AbsenceJustification_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "PresenceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
