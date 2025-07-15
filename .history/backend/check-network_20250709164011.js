/**
 * 🔍 DIAGNOSTIC RÉSEAU - Connectivité SMTP Gmail
 * Vérifie si le serveur peut accéder aux serveurs Gmail
 */

const net = require('net');

function testConnection(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      console.log(`✅ Connexion réussie: ${host}:${port}`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`⏱️ Timeout: ${host}:${port} (>${timeout}ms)`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`❌ Erreur connexion: ${host}:${port} - ${err.message}`);
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function checkNetworkConnectivity() {
  console.log('🔍 Diagnostic connectivité réseau...\n');
  
  // Test connectivité basique
  console.log('📡 Test connectivité internet:');
  const googleDNS = await testConnection('8.8.8.8', 53, 3000);
  console.log(`   Google DNS (8.8.8.8:53): ${googleDNS ? '✅' : '❌'}\n`);
  
  // Test serveurs SMTP Gmail
  console.log('📧 Test serveurs SMTP Gmail:');
  const gmail587 = await testConnection('smtp.gmail.com', 587, 5000);
  const gmail465 = await testConnection('smtp.gmail.com', 465, 5000);
  const gmail25 = await testConnection('smtp.gmail.com', 25, 5000);
  
  console.log(`   smtp.gmail.com:587 (STARTTLS): ${gmail587 ? '✅' : '❌'}`);
  console.log(`   smtp.gmail.com:465 (SSL/TLS): ${gmail465 ? '✅' : '❌'}`);
  console.log(`   smtp.gmail.com:25 (Plain): ${gmail25 ? '✅' : '❌'}\n`);
  
  // Test autres services courants
  console.log('🌐 Test autres services:');
  const http80 = await testConnection('google.com', 80, 3000);
  const https443 = await testConnection('google.com', 443, 3000);
  
  console.log(`   HTTP (google.com:80): ${http80 ? '✅' : '❌'}`);
  console.log(`   HTTPS (google.com:443): ${https443 ? '✅' : '❌'}\n`);
  
  // Analyse des résultats
  console.log('📊 ANALYSE:');
  
  if (!googleDNS) {
    console.log('❌ Problème de connectivité internet basique');
  } else if (!gmail587 && !gmail465 && !gmail25) {
    console.log('❌ Tous les ports SMTP Gmail sont bloqués');
    console.log('   → Firewall sortant bloque SMTP');
    console.log('   → Contactez votre hébergeur (DigitalOcean, AWS, etc.)');
  } else if (gmail587) {
    console.log('✅ Port 587 disponible - Configuration actuelle OK');
  } else if (gmail465) {
    console.log('⚠️ Seul le port 465 fonctionne');
    console.log('   → Changez dans mail.service.ts: port: 465, secure: true');
  } else if (gmail25) {
    console.log('⚠️ Seul le port 25 fonctionne (rare)');
    console.log('   → Changez dans mail.service.ts: port: 25, secure: false');
  }
  
  if (!http80 && !https443) {
    console.log('❌ Problème de connectivité HTTP/HTTPS général');
  }
}

checkNetworkConnectivity(); 