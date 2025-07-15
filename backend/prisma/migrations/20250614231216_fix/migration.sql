-- AlterTable
ALTER TABLE "PresenceSheet" ALTER COLUMN "staffId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PresenceSheet" ADD CONSTRAINT "PresenceSheet_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
