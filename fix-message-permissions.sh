#!/bin/bash

echo "🔧 Déploiement des corrections pour les permissions des messages..."

# 1. Construire l'image backend
echo "📦 Construction de l'image backend..."
cd backend
docker build -t educare-backend:latest -f Dockerfile.nest . || {
    echo "❌ Échec de la construction de l'image backend"
    exit 1
}

# 2. Construire l'image frontend
echo "📦 Construction de l'image frontend..."
cd ../frontend
docker build -t educare-frontend:latest -f Dockerfile.frontend . || {
    echo "❌ Échec de la construction de l'image frontend"
    exit 1
}

# 3. Déployer les services
echo "🚀 Déploiement des services..."
cd ..
docker service update --image educare-backend:latest projet-5iw_backend || {
    echo "❌ Échec du déploiement backend"
    exit 1
}

docker service update --image educare-frontend:latest projet-5iw_frontend || {
    echo "❌ Échec du déploiement frontend"
    exit 1
}

# 4. Attendre le déploiement
echo "⏳ Attente du redémarrage des services..."
sleep 30

# 5. Vérifier les services
echo "✅ Vérification des services..."
docker service ls | grep projet-5iw

echo "🎉 Déploiement terminé !"
echo ""
echo "🔍 Corrections appliquées :"
echo "  - Comparaison d'auteur robuste avec .toString()"
echo "  - Prévention des jointures multiples de chat"
echo "  - Amélioration des erreurs d'authentification WebSocket"
echo "  - Ajout de logs de debug pour identifier les problèmes d'ownership"
echo ""
echo "📋 Tests à effectuer :"
echo "  1. Envoyer un message et vérifier qu'il peut être édité/supprimé"
echo "  2. Vérifier que les messages d'autres utilisateurs ne peuvent pas être modifiés"
echo "  3. Tester les conversations multiples"
echo "  4. Vérifier la stabilité des WebSockets"
echo ""
echo "📊 Surveillez les logs avec :"
echo "  docker service logs -f projet-5iw_backend" 