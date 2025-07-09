#!/bin/bash

echo "🔧 Déploiement des corrections pour les doublons de chat"

# Build du backend
echo "📦 Build du backend..."
cd backend
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build réussi"
else
    echo "❌ Erreur lors du build"
    exit 1
fi

# Build du frontend
echo "📦 Build du frontend..."
cd ../frontend
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build frontend réussi"
else
    echo "❌ Erreur lors du build frontend"
    exit 1
fi

# Retour au répertoire racine
cd ..

# Redémarrage des services avec docker-compose
echo "🔄 Redémarrage des services..."
docker-compose down
docker-compose up -d --build

echo "⏳ Attente du démarrage des services..."
sleep 10

# Test de connectivité
echo "🔍 Test de connectivité..."
curl -s https://api.educareschool.me/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ API accessible"
else
    echo "⚠️ API non accessible - vérifiez les logs"
fi

echo "🎉 Déploiement terminé"
echo "📋 Corrections appliquées:"
echo "   - Suppression de parentProfile pour les DIRECTOR"
echo "   - Amélioration de la déduplication des contacts"
echo "   - Déduplication des conversations existantes"
echo "   - Protection contre les doublons lors de la création"
echo "   - Ajout de logs pour le debugging" 