-- CreateIndex
-- Migration pour ajouter la traçabilité des transferts d'enfants

-- Ajouter le champ originalEntryId à la table EntryChild
ALTER TABLE "EntryChild" ADD COLUMN "originalEntryId" TEXT;

-- Créer un index pour améliorer les performances des requêtes de restauration
CREATE INDEX "EntryChild_originalEntryId_idx" ON "EntryChild"("originalEntryId"); 