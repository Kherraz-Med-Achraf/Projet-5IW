#!/bin/bash

echo "🔧 Correctifs d'authentification WebSocket"
echo "=========================================="

# Push les changements vers le dépôt
echo "1. Push des correctifs vers le dépôt Git..."
git add .
git commit -m "fix: corriger l'authentification WebSocket et les erreurs 502"
git push origin deploy

echo ""
echo "2. Redéploiement sur le serveur..."
echo "   Exécutez sur votre serveur:"
echo "   git pull origin deploy"
echo "   docker stack deploy -c docker-compose.swarm.yml educare"

echo ""
echo "3. CORRECTIFS APPLIQUÉS:"
echo "   ✅ Vérification d'authentification avant chaque action WebSocket"
echo "   ✅ Gestion des tokens invalides et utilisateurs inexistants"
echo "   ✅ Configuration trust proxy optimisée pour Traefik"
echo "   ✅ Rate limiting amélioré"

echo ""
echo "4. ERREURS CORRIGÉES:"
echo "   ❌ 'Cannot read properties of undefined (reading 'id')'"
echo "   ❌ 'ERR_ERL_PERMISSIVE_TRUST_PROXY'"
echo "   ❌ 'Tentative de connexion avec token invalide'"

echo ""
echo "5. TEST DES WEBSOCKETS:"
echo "   - Connectez-vous sur https://educareschool.me"
echo "   - Allez dans /chat"
echo "   - Ouvrez la console (F12)"
echo "   - Envoyez un message"
echo "   - Vérifiez qu'il apparaît INSTANTANÉMENT sans refresh"

echo ""
echo "6. VÉRIFICATION DES LOGS:"
echo "   docker service logs educare_nest --tail=20"
echo "   - Plus d'erreurs 'Cannot read properties of undefined'"
echo "   - Plus d'erreurs trust proxy"
echo "   - Connexions WebSocket réussies"

echo ""
echo "7. DEBUG EN CAS DE PROBLÈME:"
echo "   Dans la console navigateur:"
echo "   > window.chatStore = useChatStore()"
echo "   > window.chatStore.getSocketStatus()"
echo "   > // Attendu: { connected: true, transport: 'websocket' }"

echo ""
echo "💡 Si les WebSockets ne fonctionnent toujours pas,"
echo "   vérifiez que vous êtes bien connecté et que votre token est valide." 