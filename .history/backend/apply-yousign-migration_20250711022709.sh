#!/bin/bash

# Script pour appliquer la migration YouSign en production
# Ce script ajoute les colonnes manquantes à la table Document

echo "🔧 Application de la migration YouSign..."

# Exécuter la migration SQL
docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d mydb << 'EOF'
-- Migration pour ajouter les colonnes YouSign manquantes

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
EOF

if [ $? -eq 0 ]; then
    echo "✅ Migration YouSign appliquée avec succès!"
    echo "📝 Les colonnes 'youSignRequestId' et 'signedFilePath' ont été ajoutées à la table Document"
    
    # Redémarrer les conteneurs backend pour recharger Prisma
    echo "🔄 Redémarrage des conteneurs backend..."
    docker-compose restart nest
    
    echo "🎉 Migration terminée! Vous pouvez maintenant créer des documents."
else
    echo "❌ Erreur lors de l'application de la migration"
    exit 1
fi 