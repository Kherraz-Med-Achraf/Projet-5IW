/**
 * 📧 TEST RAPIDE - ENVOI EMAIL
 * Exécutez ce script pour vérifier que Gmail fonctionne
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🧪 Test configuration email...');
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Configuré' : '❌ Manquant'}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Variables manquantes dans .env');
    return;
  }

  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    console.log('📧 Envoi email de test...');
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // S'envoie à soi-même pour tester
      subject: '🧪 Test email - Projet 5IW',
      html: `
        <h2>✅ Email configuré avec succès !</h2>
        <p>Ce test confirme que l'envoi d'emails fonctionne.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
    });

    console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Vérifiez votre boîte email: ${process.env.EMAIL_USER}`);
    
  } catch (error) {
    console.error('❌ ERREUR EMAIL:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 PROBLÈME D\'AUTHENTIFICATION:');
      console.error('   → Vérifiez que la validation 2FA est activée');
      console.error('   → Vérifiez le mot de passe d\'application Gmail');
      console.error('   → Le mot de passe doit être sans espaces');
    }
  }
}

testEmail(); 