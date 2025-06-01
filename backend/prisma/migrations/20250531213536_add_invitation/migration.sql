/*
  Warnings:

  - You are about to drop the `Presence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RosterEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SchoolYear` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Presence" DROP CONSTRAINT "Presence_rosterEntryId_fkey";

-- DropForeignKey
ALTER TABLE "RosterEntry" DROP CONSTRAINT "RosterEntry_registeredChildId_fkey";

-- DropForeignKey
ALTER TABLE "RosterEntry" DROP CONSTRAINT "RosterEntry_schoolYearId_fkey";

-- DropTable
DROP TABLE "Presence";

-- DropTable
DROP TABLE "RosterEntry";

-- DropTable
DROP TABLE "SchoolYear";

-- DropEnum
DROP TYPE "PresenceStatus";

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "roleToAssign" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
