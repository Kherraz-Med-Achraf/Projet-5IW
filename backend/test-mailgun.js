/**
 * 🧪 TEST MAILGUN - Vérification rapide
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testMailgun() {
  console.log('🧪 Test configuration Mailgun...');
  
  const domain = process.env.MAILGUN_DOMAIN;
  const apiKey = process.env.MAILGUN_API_KEY;
  
  console.log(`   MAILGUN_DOMAIN: ${domain || '❌ Manquant'}`);
  console.log(`   MAILGUN_API_KEY: ${apiKey ? '✅ Configuré' : '❌ Manquant'}`);

  if (!domain || !apiKey) {
    console.error('\n❌ Variables Mailgun manquantes dans .env');
    console.log('Ajoutez :');
    console.log('MAILGUN_DOMAIN=votre-sandbox-xxxxx.mailgun.org');
    console.log('MAILGUN_API_KEY=votre-api-key');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    auth: {
      user: `postmaster@${domain}`,
      pass: apiKey,
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  try {
    console.log('\n📧 Envoi email de test via Mailgun...');
    
    const info = await transporter.sendMail({
      from: `Test École <test@${domain}>`,
      to: 'pentalingo@gmail.com', // Votre email de test
      subject: '🧪 Test Mailgun - Projet 5IW',
      html: `
        <h2>✅ Mailgun fonctionne parfaitement !</h2>
        <p>Ce test confirme que l'envoi d'emails via Mailgun est opérationnel.</p>
        <p><strong>Domain:</strong> ${domain}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p><small>Envoyé depuis Mailgun SMTP</small></p>
      `,
    });

    console.log('\n✅ EMAIL MAILGUN ENVOYÉ AVEC SUCCÈS !');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Vérifiez votre boîte email: pentalingo@gmail.com`);
    console.log('\n🚀 Mailgun est prêt pour la production !');
    
  } catch (error) {
    console.error('\n❌ ERREUR MAILGUN:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 PROBLÈME D\'AUTHENTIFICATION:');
      console.error('   → Vérifiez votre API Key Mailgun');
      console.error('   → Vérifiez votre domain Mailgun');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ TIMEOUT:');
      console.error('   → Problème de connectivité réseau');
    }
  }
}

testMailgun(); 