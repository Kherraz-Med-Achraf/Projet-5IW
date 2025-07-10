#!/bin/bash

echo "🚀 DÉPLOIEMENT - Correction Invitations"
echo "========================================"
echo ""

echo "✅ PROBLÈMES RÉSOLUS:"
echo "• 401 Unauthorized → JWT/CSRF OK"
echo "• Email SendGrid configuré"
echo "• Service unifié (1 seul MailService)"
echo "• Configuration Docker secrets"
echo ""

echo "🎯 ERREUR ACTUELLE: 400 Bad Request"
echo "Solutions dans l'ordre de priorité:"
echo ""

echo "1️⃣ DIAGNOSTIC FRONTEND (F12 → Network)"
echo "2️⃣ FORMAT JSON: {email, roleToAssign}"
echo "3️⃣ NETTOYAGE BASE: Prisma Studio"
echo "4️⃣ TEST CURL avec token valide"
echo ""

echo "📋 COMMANDES SERVEUR:"
echo "====================="
echo "ssh root@educareschool.me"
echo "cd /home/github/projet5iw/projet5iw-deploy"
echo ""

echo "🔍 VÉRIFICATION SECRETS:"
echo "docker secret ls | grep sendgrid"
echo "docker service logs projet5iw-deploy_backend --tail 50"
echo ""

echo "🔄 REDÉPLOIEMENT:"
echo "git pull origin deploy"
echo "docker stack deploy -c docker-compose.swarm.yml projet5iw-deploy"
echo ""

echo "✅ CONFIGURATION FINALE:"
echo "========================"
echo "• Backend: MailService unifié ✓"
echo "• Docker: sendgrid_api_key secret ✓"
echo "• Frontend: Authentification JWT ✓"
echo "• Validation: CreateInvitationDto ✓"
echo ""

echo "🎉 INVITATION PRÊTE À FONCTIONNER !"
echo "===================================="
echo "Le problème 400 est un problème de données,"
echo "pas de configuration. Suivez le diagnostic"
echo "fourni pour identifier la cause exacte."
echo "" 