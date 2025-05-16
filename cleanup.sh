#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="projet5iw"

echo "🛑 Suppression de la stack $STACK_NAME..."
docker stack rm "$STACK_NAME"

echo "⏳ Attente de la suppression complète de la stack..."
sleep 10

echo "🗑 Suppression de tous les volumes Docker..."
docker volume rm -f $(docker volume ls -q) || true

echo "🚮 Prune des volumes inutilisés..."
docker volume prune -f

echo "🚮 Prune des réseaux inutilisés..."
docker network prune -f

echo "✅ Nettoyage terminé."
