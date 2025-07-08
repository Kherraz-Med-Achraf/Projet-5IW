#!/bin/bash

echo "🚨 RÉPARATION D'URGENCE - 502 Bad Gateway"
echo "=========================================="

# Vérifier l'état des services
echo "1. État des services actuels:"
docker stack services educare

echo ""
echo "2. Vérification des logs du service nest:"
docker service logs educare_nest --tail=30

echo ""
echo "3. Redémarrage du service nest:"
docker service update --force educare_nest

echo ""
echo "4. Attente de 30 secondes pour le redémarrage..."
sleep 30

echo ""
echo "5. Vérification du statut après redémarrage:"
docker stack services educare

echo ""
echo "6. Test de connectivité:"
curl -I https://api.educareschool.me/health || echo "Service encore indisponible"

echo ""
echo "7. Si le problème persiste, redéployons avec la configuration corrigée:"
echo "   git pull origin deploy"
echo "   docker stack deploy -c docker-compose.swarm.yml educare"

echo ""
echo "8. Logs en temps réel (Ctrl+C pour arrêter):"
docker service logs educare_nest --follow 