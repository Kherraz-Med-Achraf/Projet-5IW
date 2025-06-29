-- Migration pour ajouter le champ imageConsent à la table Child
-- À exécuter avec: psql -d mydb -f add_image_consent_migration.sql

ALTER TABLE "Child" ADD COLUMN "imageConsent" BOOLEAN NOT NULL DEFAULT false;

-- Commentaire pour documenter le champ
COMMENT ON COLUMN "Child"."imageConsent" IS 'Droit à l''image de l''enfant accordé par le parent';

-- Vérification que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Child' AND column_name = 'imageConsent'; 