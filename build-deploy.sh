# Mode forcé à "prod"
MODE="prod"

DOCKER_USER=achraf97
TAG_SUFFIX=$MODE
FRONT_TAG=$DOCKER_USER/projet5iw-frontend:$TAG_SUFFIX
BACK_TAG=$DOCKER_USER/projet5iw-nest:$TAG_SUFFIX

echo "➡️ Building production images..."

docker build -t $FRONT_TAG --target production -f ./frontend/Dockerfile.frontend ./frontend
docker build -t $BACK_TAG --target production -f ./backend/Dockerfile.nest ./backend

echo "✅ Images built."

echo "📤 Pushing images to Docker Hub..."
docker push $FRONT_TAG
docker push $BACK_TAG
echo "✅ Images pushed."

echo "🚀 Deploying to Docker Swarm..."
docker stack deploy -c docker-compose.swarm.yml projet5iw
echo "✅ Déploiement terminé !"
