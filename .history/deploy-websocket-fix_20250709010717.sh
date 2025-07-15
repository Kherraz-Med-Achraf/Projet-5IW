#!/bin/bash

set -e

echo "🚀 Déploiement des corrections WebSocket..."

# 1. Build et push les images
echo "📦 Build et push des images Docker..."
docker build -t achraf97/projet5iw-frontend:prod -f frontend/Dockerfile.frontend frontend/
docker build -t achraf97/projet5iw-nest:prod -f backend/Dockerfile.nest backend/

docker push achraf97/projet5iw-frontend:prod
docker push achraf97/projet5iw-nest:prod

# 2. Déployer sur Docker Swarm
echo "🔄 Déploiement sur Docker Swarm..."
docker stack deploy -c docker-compose.swarm.yml educare

# 3. Attendre que les services se mettent à jour
echo "⏳ Attente de la mise à jour des services..."
sleep 30

# 4. Vérifier les logs
echo "📋 Vérification des logs..."
docker service logs educare_nest --tail=20
docker service logs educare_frontend --tail=20

# 5. Vérifier l'état des services
echo "🔍 État des services:"
docker stack services educare

echo "✅ Déploiement terminé!"
echo "🌐 Frontend: https://educareschool.me"
echo "🌐 Backend: https://api.educareschool.me"
echo ""
echo "🧪 Pour tester le WebSocket:"
echo "- Ouvrir la console du navigateur"
echo "- Aller sur /chat"
echo "- Vérifier les logs [WebSocket] dans la console"
echo "- Tester l'envoi/réception de messages" 