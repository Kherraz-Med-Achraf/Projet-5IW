#!/bin/bash

echo "🚀 DÉPLOIEMENT MAILGUN - Projet 5IW"
echo "===================================="

# 1. Vérification configuration locale
echo "🔍 1. Vérification configuration locale..."
if ! grep -q "MAILGUN_DOMAIN=" .env || ! grep -q "MAILGUN_API_KEY=" .env; then
    echo "❌ Variables Mailgun manquantes dans .env"
    echo "Ajoutez :"
    echo "MAILGUN_DOMAIN=sandbox-xxxxx.mailgun.org"
    echo "MAILGUN_API_KEY=key-xxxxx"
    exit 1
fi

echo "✅ Variables Mailgun trouvées dans .env"

# 2. Test local
echo -e "\n🧪 2. Test local Mailgun..."
node test-mailgun.js
if [ $? -ne 0 ]; then
    echo "❌ Test local échoué - vérifiez vos credentials Mailgun"
    exit 1
fi

# 3. Build
echo -e "\n📦 3. Build application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur de build"
    exit 1
fi

# 4. Instructions déploiement production
echo -e "\n🚀 4. COMMANDES POUR LE SERVEUR :"
echo "==============================================="
echo ""
echo "# A. Connexion au serveur"
echo "ssh root@educareschool.me"
echo ""
echo "# B. Configuration des variables d'environnement"
echo "cd /home/github/projet5iw/projet5iw-deploy"
echo "echo 'MAILGUN_DOMAIN=VOS_VRAIES_VALEURS' >> .env"
echo "echo 'MAILGUN_API_KEY=VOS_VRAIES_VALEURS' >> .env"
echo ""
echo "# C. Redéploiement"
echo "docker-compose down nest"
echo "docker-compose build nest"
echo "docker-compose up -d nest"
echo ""
echo "# D. Vérification des logs"
echo "docker-compose logs -f nest | grep 'MAILGUN'"
echo ""
echo "# E. Test sur production"
echo "# Testez une invitation dans l'interface web"

echo -e "\n✅ Mailgun est configuré et prêt !"
echo "Suivez les instructions ci-dessus pour déployer en production." 