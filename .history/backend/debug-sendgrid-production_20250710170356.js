#!/usr/bin/env node

console.log('🔍 DIAGNOSTIC SENDGRID PRODUCTION');
console.log('=================================');

// 1. Vérifier les variables d'environnement
console.log('\n📋 VARIABLES D\'ENVIRONNEMENT :');
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configuré' : '❌ Manquant');

// 2. Vérifier le fichier secret Docker
console.log('\n🔐 FICHIER SECRET DOCKER :');
const fs = require('fs');
const secretPath = '/run/secrets/sendgrid_api_key';

try {
  const secretValue = fs.readFileSync(secretPath, 'utf8').trim();
  console.log(`✅ Secret trouvé dans ${secretPath}`);
  console.log(`   Longueur: ${secretValue.length} caractères`);
  console.log(`   Préfixe: ${secretValue.substring(0, 10)}...`);
} catch (error) {
  console.log(`❌ Secret introuvable dans ${secretPath}`);
  console.log(`   Erreur: ${error.message}`);
}

// 3. Simulation de readSecret
console.log('\n⚙️ SIMULATION readSecret() :');
function readSecret(filePath, envVar) {
  const envValue = process.env[envVar];
  if (envValue && envValue.length > 0) {
    console.log(`✅ Variable d'env ${envVar} trouvée`);
    return envValue;
  }

  try {
    const fileValue = fs.readFileSync(filePath, 'utf8').trim();
    console.log(`✅ Secret Docker trouvé dans ${filePath}`);
    return fileValue;
  } catch (err) {
    console.log(`❌ Échec lecture secret: ${err.message}`);
    throw new Error(`Unable to read secret '${envVar}'. Checked env var and file path '${filePath}'.`);
  }
}

try {
  const sendgridKey = readSecret('/run/secrets/sendgrid_api_key', 'SENDGRID_API_KEY');
  console.log('🎉 SendGrid configuré correctement !');
  console.log(`   Clé: ${sendgridKey.substring(0, 10)}...`);
} catch (error) {
  console.log('💥 Erreur configuration SendGrid !');
  console.log(`   ${error.message}`);
}

// 4. Test de connexion SendGrid
console.log('\n🌐 TEST CONNEXION SENDGRID :');
const nodemailer = require('nodemailer');

async function testSendGrid() {
  try {
    const sendgridKey = readSecret('/run/secrets/sendgrid_api_key', 'SENDGRID_API_KEY');
    
    const transporter = nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: sendgridKey,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    await transporter.verify();
    console.log('✅ Connexion SendGrid réussie !');
    
  } catch (error) {
    console.log('❌ Échec connexion SendGrid :');
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
  }
}

testSendGrid().then(() => {
  console.log('\n🏁 Diagnostic terminé');
}).catch(console.error); 