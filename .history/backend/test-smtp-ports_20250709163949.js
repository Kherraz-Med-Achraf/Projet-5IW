/**
 * 🧪 TEST PORTS SMTP - Gmail
 * Teste les ports 587 et 465 pour voir lequel fonctionne sur votre serveur
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPPort(port, secure, description) {
  console.log(`\n🧪 Test ${description}:`);
  console.log(`   Port: ${port}`);
  console.log(`   Secure: ${secure}`);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000, // 10 secondes pour le test
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log(`📧 Tentative connexion...`);
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `🧪 Test SMTP ${description} - Port ${port}`,
      html: `
        <h3>✅ Test réussi !</h3>
        <p><strong>Port:</strong> ${port}</p>
        <p><strong>Secure:</strong> ${secure}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
    });

    console.log(`✅ SUCCÈS avec ${description} !`);
    console.log(`   Message ID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.log(`❌ ÉCHEC avec ${description}`);
    console.log(`   Erreur: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Test des ports SMTP Gmail...');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Configuré' : '❌ Manquant'}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('\n❌ Variables EMAIL manquantes dans .env');
    return;
  }

  // Test port 587 (STARTTLS)
  const port587Works = await testSMTPPort(587, false, 'Port 587 (STARTTLS)');
  
  // Test port 465 (SSL/TLS)
  const port465Works = await testSMTPPort(465, true, 'Port 465 (SSL/TLS)');

  console.log('\n📊 RÉSULTATS:');
  console.log(`   Port 587: ${port587Works ? '✅ Fonctionne' : '❌ Bloqué'}`);
  console.log(`   Port 465: ${port465Works ? '✅ Fonctionne' : '❌ Bloqué'}`);

  if (port587Works) {
    console.log('\n✅ RECOMMANDATION: Utilisez port 587 (déjà configuré)');
  } else if (port465Works) {
    console.log('\n⚠️ RECOMMANDATION: Modifiez vers port 465');
    console.log('   Dans mail.service.ts: port: 465, secure: true');
  } else {
    console.log('\n❌ PROBLÈME: Aucun port ne fonctionne');
    console.log('   → Firewall bloque SMTP sortant');
    console.log('   → Contactez votre hébergeur');
  }
}

runTests(); 