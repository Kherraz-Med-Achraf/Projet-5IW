#!/bin/bash

echo "🚨 Déploiement d'urgence - Correction des problèmes de connexion"
echo "================================================================="

# Fonction pour vérifier si une étape a échoué
check_exit_code() {
    if [ $? -ne 0 ]; then
        echo "❌ $1 a échoué. Arrêt du déploiement."
        exit 1
    fi
}

# 1. Arrêter les services existants
echo "🛑 Arrêt des services..."
docker service rm projet-5iw_backend projet-5iw_frontend 2>/dev/null || true
sleep 10

# 2. Nettoyer les images
echo "🧹 Nettoyage des images..."
docker image rm educare-backend:latest educare-frontend:latest 2>/dev/null || true

# 3. Rebuild backend avec configuration simplifiée
echo "🔧 Rebuild backend..."
cd backend
docker build -t educare-backend:latest -f Dockerfile.nest . --no-cache
check_exit_code "Build backend"

# 4. Rebuild frontend
echo "🔧 Rebuild frontend..."
cd ../frontend
docker build -t educare-frontend:latest -f Dockerfile.frontend . --no-cache
check_exit_code "Build frontend"

# 5. Redémarrer les services
echo "🚀 Redémarrage des services..."
cd ..
docker stack deploy -c docker-compose.yml projet-5iw
check_exit_code "Déploiement Docker Stack"

# 6. Attendre que les services démarrent
echo "⏳ Attente du démarrage des services..."
sleep 60

# 7. Vérifier les services
echo "✅ Vérification des services..."
docker service ls | grep projet-5iw

# 8. Test de connectivité
echo "🌐 Test de connectivité..."
for i in {1..10}; do
    echo "Tentative $i/10..."
    response=$(curl -s -o /dev/null -w "%{http_code}" https://api.educareschool.me/health)
    if [ "$response" = "200" ]; then
        echo "✅ Backend accessible (HTTP $response)"
        break
    else
        echo "⏳ Backend non accessible (HTTP $response), nouvelle tentative..."
        sleep 10
    fi
done

# 9. Test CORS
echo "🌍 Test CORS..."
cors_response=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
    -H "Origin: https://educareschool.me" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    https://api.educareschool.me/auth/initiate-login)

if [ "$cors_response" = "200" ] || [ "$cors_response" = "204" ]; then
    echo "✅ CORS configuré correctement (HTTP $cors_response)"
else
    echo "⚠️ CORS pourrait avoir des problèmes (HTTP $cors_response)"
fi

# 10. Afficher les logs récents
echo "📋 Logs récents du backend:"
docker service logs --tail 20 projet-5iw_backend

echo ""
echo "🎉 Déploiement terminé !"
echo ""
echo "🔍 Changements appliqués :"
echo "  - Configuration CORS améliorée"
echo "  - Rate limiting plus permissif (50 req/min pour /auth)"
echo "  - Logs de debug supprimés"
echo "  - Permissions de messages corrigées avec .toString()"
echo "  - Prévention des jointures multiples de chat"
echo ""
echo "🧪 Testez maintenant :"
echo "  1. Connexion : https://educareschool.me/login"
echo "  2. Messages : envoi, édition, suppression"
echo "  3. Conversations multiples"
echo ""
echo "📊 Surveillez les logs avec :"
echo "  docker service logs -f projet-5iw_backend" 