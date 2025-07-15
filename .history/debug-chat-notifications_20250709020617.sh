#!/bin/bash

echo "🔧 Déploiement des corrections de notifications chat..."
echo "====================================================="

# 1. Construire et déployer backend
echo "📦 Build et déploiement backend..."
cd backend
docker build -t educare-backend:latest -f Dockerfile.nest . || exit 1
docker service update --image educare-backend:latest projet-5iw_backend || exit 1

# 2. Construire et déployer frontend
echo "📦 Build et déploiement frontend..."
cd ../frontend
docker build -t educare-frontend:latest -f Dockerfile.frontend . || exit 1
docker service update --image educare-frontend:latest projet-5iw_frontend || exit 1

# 3. Attendre le redémarrage
echo "⏳ Attente du redémarrage des services..."
sleep 30

# 4. Vérifier les services
echo "✅ Vérification des services..."
docker service ls | grep projet-5iw

echo ""
echo "🔍 Logs de debug ajoutés :"
echo "  Backend:"
echo "    - User rejoint sa room personnelle"
echo "    - Participants du chat vs users dans la room"
echo "    - Envoi de notifications chatUpdated"
echo "  Frontend:"
echo "    - Réception des notifications chatUpdated"
echo "    - Jointure automatique des conversations"
echo "    - Mise à jour des compteurs non lus"
echo ""
echo "🧪 Pour tester les notifications :"
echo "  1. Ouvrir deux navigateurs avec des comptes différents"
echo "  2. Créer une conversation entre A et B"
echo "  3. A envoie un message"
echo "  4. Vérifier que B reçoit la notification sans refresh"
echo ""
echo "📊 Surveillez les logs avec :"
echo "  docker service logs -f projet-5iw_backend | grep -E 'chatUpdated|room|notification'"
echo "  (Ouvrir F12 dans le navigateur pour voir les logs frontend)" 