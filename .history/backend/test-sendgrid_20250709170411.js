/**
 * 🧪 TEST SENDGRID - 100% Gratuit (sans carte bancaire)
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSendGrid() {
  console.log('🧪 Test configuration SendGrid...');
  
  const apiKey = process.env.SENDGRID_API_KEY;
  
  console.log(`   SENDGRID_API_KEY: ${apiKey ? '✅ Configuré' : '❌ Manquant'}`);

  if (!apiKey) {
    console.error('\n❌ Variable SendGrid manquante dans .env');
    console.log('Ajoutez :');
    console.log('SENDGRID_API_KEY=SG.xxxxxxxxx');
    console.log('\n📝 Pour obtenir votre API Key :');
    console.log('1. → https://signup.sendgrid.com/');
    console.log('2. Confirmez votre email');
    console.log('3. Settings → API Keys → Create API Key');
    console.log('4. Full Access → Create & Review');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey', // Toujours "apikey" pour SendGrid
      pass: apiKey,
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  try {
    console.log('\n📧 Envoi email de test via SendGrid...');
    
    const info = await transporter.sendMail({
      from: 'École <test@educareschool.me>',
      to: 'pentalingo@gmail.com', // Votre email de test
      subject: '🧪 Test SendGrid - Projet 5IW',
      html: `
        <h2>✅ SendGrid fonctionne parfaitement !</h2>
        <p>Ce test confirme que l'envoi d'emails via SendGrid est opérationnel.</p>
        <p><strong>Service:</strong> SendGrid (100% gratuit)</p>
        <p><strong>Limite:</strong> 100 emails/jour</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p><small>Envoyé depuis SendGrid SMTP - Sans carte bancaire !</small></p>
      `,
    });

    console.log('\n🎉 EMAIL SENDGRID ENVOYÉ AVEC SUCCÈS !');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Vérifiez votre boîte email: pentalingo@gmail.com`);
    console.log('\n🚀 SendGrid est prêt pour la production !');
    console.log('💡 100 emails/jour gratuits, pas de carte bancaire requise');
    
  } catch (error) {
    console.error('\n❌ ERREUR SENDGRID:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 PROBLÈME D\'AUTHENTIFICATION:');
      console.error('   → Vérifiez votre API Key SendGrid');
      console.error('   → Format: SG.xxxxxxxxx');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ TIMEOUT:');
      console.error('   → Problème de connectivité réseau');
    }
  }
}

testSendGrid(); 