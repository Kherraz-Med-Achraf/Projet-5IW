#!/bin/bash

echo "🧹 Nettoyage des logs de debug..."
echo "================================"

# Nettoyer les logs backend
echo "🔧 Nettoyage backend..."
sed -i.bak '/console\.log.*INFO.*room personnelle/d' backend/src/chat/chat.gateway.ts
sed -i.bak '/console\.log.*INFO.*Participants du chat/d' backend/src/chat/chat.gateway.ts
sed -i.bak '/console\.log.*INFO.*Users dans la room/d' backend/src/chat/chat.gateway.ts
sed -i.bak '/console\.log.*INFO.*est l.auteur du message/d' backend/src/chat/chat.gateway.ts
sed -i.bak '/console\.log.*INFO.*est dans la room/d' backend/src/chat/chat.gateway.ts
sed -i.bak '/console\.log.*INFO.*Envoi notification chatUpdated/d' backend/src/chat/chat.gateway.ts

# Nettoyer les logs frontend
echo "🔧 Nettoyage frontend..."
sed -i.bak '/console\.log.*ChatStore.*Notification chatUpdated/d' frontend/src/stores/chatStore.ts
sed -i.bak '/console\.log.*ChatStore.*Chat trouvé/d' frontend/src/stores/chatStore.ts
sed -i.bak '/console\.log.*ChatStore.*Compteur non lus/d' frontend/src/stores/chatStore.ts
sed -i.bak '/console\.log.*ChatStore.*Chat remonté/d' frontend/src/stores/chatStore.ts
sed -i.bak '/console\.log.*ChatStore.*Chat non trouvé/d' frontend/src/stores/chatStore.ts
sed -i.bak '/console\.log.*ChatStore.*Jointure automatique/d' frontend/src/stores/chatStore.ts
sed -i.bak '/console\.log.*ChatStore.*Jointure de la conversation/d' frontend/src/stores/chatStore.ts

# Supprimer les fichiers de backup
rm -f backend/src/chat/chat.gateway.ts.bak
rm -f frontend/src/stores/chatStore.ts.bak

echo "✅ Logs de debug nettoyés"
echo ""
echo "🚀 Redéployez avec :"
echo "  ./emergency-deploy.sh" 