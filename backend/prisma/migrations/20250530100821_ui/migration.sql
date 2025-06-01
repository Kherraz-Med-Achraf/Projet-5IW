-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "SchoolYear" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterEntry" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "schoolYearId" INTEGER NOT NULL,
    "registeredChildId" INTEGER,

    CONSTRAINT "RosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "PresenceStatus" NOT NULL,
    "rosterEntryId" INTEGER NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_year_key" ON "SchoolYear"("year");

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_firstName_lastName_schoolYearId_key" ON "RosterEntry"("firstName", "lastName", "schoolYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_date_rosterEntryId_key" ON "Presence"("date", "rosterEntryId");

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_registeredChildId_fkey" FOREIGN KEY ("registeredChildId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_rosterEntryId_fkey" FOREIGN KEY ("rosterEntryId") REFERENCES "RosterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
