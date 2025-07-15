#!/bin/bash

echo "🔄 Déploiement des améliorations WebSocket"
echo "========================================="

# Push les changements vers le dépôt
echo "1. Push des modifications vers le dépôt Git..."
git add .
git commit -m "fix: amélioration configuration WebSocket pour Traefik"
git push origin deploy

echo ""
echo "2. Attendez 2-3 minutes que les services se mettent à jour automatiquement..."
echo "   ou exécutez manuellement sur le serveur:"
echo "   git pull origin deploy"
echo "   docker stack deploy -c docker-compose.swarm.yml educare"

echo ""
echo "3. TEST DES WEBSOCKETS:"
echo "   - Ouvrir https://educareschool.me/chat"
echo "   - Ouvrir la console développeur (F12)"
echo "   - Chercher ces logs:"
echo "     ✅ '[WebSocket] Connexion à: https://api.educareschool.me/chat'"
echo "     ✅ '[WebSocket] Connexion établie avec le serveur'"
echo "     ✅ '[ChatStore] Initialisation du socket WebSocket'"

echo ""
echo "4. TESTER L'ENVOI DE MESSAGES:"
echo "   - Envoyer un message depuis un compte"
echo "   - Vérifier qu'il apparaît IMMÉDIATEMENT dans l'autre conversation"
echo "   - Pas besoin de refresh si WebSocket fonctionne"

echo ""
echo "5. DEBUG EN CAS DE PROBLÈME:"
echo "   Dans la console navigateur, tapez:"
echo "   > window.chatStore = useChatStore()"
echo "   > window.chatStore.getSocketStatus()"
echo "   > // Doit retourner: { connected: true, transport: 'websocket' }"

echo ""
echo "6. SI LES WEBSOCKETS NE FONCTIONNENT TOUJOURS PAS:"
echo "   - Vérifier que transport: 'websocket' (pas 'polling')"
echo "   - Forcer la reconnexion: window.chatStore.forceReconnect()"
echo "   - Vérifier les logs serveur: docker service logs educare_nest"

echo ""
echo "✨ Configuration appliquée:"
echo "   - Traefik: passhostheader=true, sticky=true"
echo "   - Socket.IO: upgrade=true, rememberUpgrade=true"
echo "   - Fallback automatique sur polling si WebSocket échoue" 