#!/bin/bash

echo "🚀 RÉPARATION EMAIL PRODUCTION - Projet 5IW"
echo "=================================================="

# 1. Build avec la nouvelle config
echo "📦 1. Build de l'application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur de build"
    exit 1
fi

# 2. Test réseau local (optionnel)
echo -e "\n🔍 2. Test réseau local (optionnel):"
echo "Voulez-vous tester la connectivité réseau? (y/n)"
read -r test_network

if [ "$test_network" = "y" ]; then
    node check-network.js
fi

# 3. Instructions de déploiement
echo -e "\n🚀 3. DÉPLOIEMENT SUR PRODUCTION:"
echo "Exécutez ces commandes sur votre serveur:"
echo ""
echo "# A. Connexion au serveur"
echo "ssh root@educareschool.me"
echo ""
echo "# B. Arrêt et rebuild du container"
echo "cd /home/github/projet5iw/projet5iw-deploy"
echo "docker-compose down nest"
echo "docker-compose build nest"
echo "docker-compose up -d nest"
echo ""
echo "# C. Test de la connectivité réseau sur le serveur"
echo "docker-compose exec nest node check-network.js"
echo ""
echo "# D. Test des ports SMTP sur le serveur"
echo "docker-compose exec nest node test-smtp-ports.js"

# 4. Configuration alternative si port 587 bloqué
echo -e "\n⚠️  4. SI LE PORT 587 EST BLOQUÉ:"
echo "Modifiez mail.service.ts pour utiliser le port 465:"
echo ""
echo "this.transporter = nodemailer.createTransport({"
echo "  host: 'smtp.gmail.com',"
echo "  port: 465,"
echo "  secure: true, // ← Changement ici"
echo "  auth: { user: emailUser, pass: emailPass },"
echo "  connectionTimeout: 60000,"
echo "  greetingTimeout: 30000,"
echo "  socketTimeout: 60000,"
echo "  tls: { rejectUnauthorized: false }"
echo "});"

# 5. Solutions alternatives
echo -e "\n🔧 5. SOLUTIONS ALTERNATIVES:"
echo ""
echo "A. Utiliser un autre service SMTP:"
echo "   → Mailgun, SendGrid, Amazon SES"
echo "   → Généralement plus fiables sur les serveurs"
echo ""
echo "B. Configurer un relay SMTP:"
echo "   → Utiliser un service externe comme relai"
echo ""
echo "C. Contacter l'hébergeur:"
echo "   → Demander l'ouverture des ports SMTP (25, 587, 465)"

echo -e "\n✅ Script terminé. Suivez les instructions ci-dessus." 