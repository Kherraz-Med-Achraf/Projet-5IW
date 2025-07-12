#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="projet5iw"

echo "🛑 Suppression de la stack $STACK_NAME..."
docker stack rm "$STACK_NAME"
docker image prune -a -f
docker container prune -f
docker volume prune -f

BUILDKIT_PRUNE_AGE="2h"

echo "🧹 Prune du cache BuildKit (builder)…"
# Nouvelle CLI (Docker ≥ 20.10)
docker builder prune -a --filter "until=${BUILDKIT_PRUNE_AGE}" -f || true
# Compatibilité Buildx (anciennes versions / multi-plateformes)
docker buildx prune  -a --filter "until=${BUILDKIT_PRUNE_AGE}" -f || true

echo "⏳ Attente de la suppression complète de la stack..."

sleep 10

echo "🗑 Suppression de tous les volumes Docker..."
docker volume rm -f $(docker volume ls -q) || true

echo "🚮 Prune des volumes inutilisés..."
docker volume prune -f

echo "🌐 Suppression des réseaux overlay associés à la stack..."
# Liste tous les réseaux dont le nom commence par "${STACK_NAME}_" (ex. projet5iw_backend-net)
docker network ls --filter "name=${STACK_NAME}_" --format '{{.ID}}' | while read -r net_id; do
  if [[ -n "$net_id" ]]; then
    echo "   ➡️  Suppression du réseau $net_id"
    docker network rm "$net_id" || true
  fi
done

# Supprimer également les réseaux overlay inutilisés (dangling)
echo "🧹 Suppression des réseaux overlay inutilisés..."
docker network ls --filter driver=overlay --filter dangling=true -q | xargs -r docker network rm || true

echo "🚮 Prune des réseaux inutilisés..."
docker network prune -f

echo "✅ Nettoyage terminé."