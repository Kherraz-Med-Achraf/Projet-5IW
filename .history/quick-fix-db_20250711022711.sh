#!/bin/bash

echo "🔧 Correction rapide de la base de données..."

# Commande SQL rapide pour ajouter les colonnes
docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d mydb -c "
ALTER TABLE \"Document\" ADD COLUMN IF NOT EXISTS \"youSignRequestId\" TEXT;
ALTER TABLE \"Document\" ADD COLUMN IF NOT EXISTS \"signedFilePath\" TEXT;
SELECT 'Colonnes ajoutées!' as status;
"

echo "✅ Colonnes ajoutées! Redémarrage du backend..."
docker-compose restart nest
echo "🎉 Prêt! Vous pouvez maintenant créer des documents." 