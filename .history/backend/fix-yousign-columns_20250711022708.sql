-- Migration pour ajouter les colonnes YouSign manquantes
-- À exécuter sur la base de données de production

-- Ajouter la colonne youSignRequestId
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "youSignRequestId" TEXT;

-- Ajouter la colonne signedFilePath  
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "signedFilePath" TEXT;

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Document' 
AND column_name IN ('youSignRequestId', 'signedFilePath');

-- Afficher un message de confirmation
SELECT 'Migration terminée: colonnes YouSign ajoutées' as message; 