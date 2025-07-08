#!/bin/bash

echo "🔍 Diagnostic du backend..."

# 1. Vérifier les services Docker
echo "📊 État des services Docker :"
docker service ls | grep projet-5iw || echo "❌ Aucun service Docker trouvé"

# 2. Vérifier les logs du backend
echo "📋 Logs récents du backend :"
docker service logs --tail 50 projet-5iw_backend 2>/dev/null || echo "❌ Impossible d'accéder aux logs du backend"

# 3. Vérifier si le backend répond
echo "🌐 Test de connectivité au backend :"
curl -s -o /dev/null -w "%{http_code}" https://api.educareschool.me/health || echo "❌ Backend inaccessible"

# 4. Vérifier les endpoints d'auth
echo "🔐 Test des endpoints d'authentification :"
curl -s -o /dev/null -w "%{http_code}" https://api.educareschool.me/auth/csrf || echo "❌ Endpoint CSRF inaccessible"

# 5. Vérifier la configuration CORS
echo "🌍 Test CORS (OPTIONS) :"
curl -s -X OPTIONS \
  -H "Origin: https://educareschool.me" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://api.educareschool.me/auth/initiate-login || echo "❌ CORS non configuré"

echo ""
echo "✅ Diagnostic terminé. Si le backend ne répond pas, redéployez avec :"
echo "   ./fix-message-permissions.sh" 