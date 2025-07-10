// Simple JWT decoder pour diagnostiquer les problèmes d'autorisation
console.log('🔍 DIAGNOSTIC TOKEN DIRECTOR - 401 Unauthorized');
console.log('================================================');
console.log('');

console.log('📋 ÉTAPES DE DIAGNOSTIC:');
console.log('========================');
console.log('');
console.log('1️⃣ VÉRIFIEZ VOTRE TOKEN JWT:');
console.log('   → Ouvrez la console navigateur (F12)');
console.log('   → Tapez: localStorage.getItem("token")');
console.log('   → Copiez le token affiché');
console.log('');

console.log('2️⃣ DÉCODEZ LE TOKEN:');
console.log('   → Allez sur https://jwt.io');
console.log('   → Collez votre token dans la section "Encoded"');
console.log('   → Regardez le payload décodé');
console.log('');

console.log('3️⃣ VÉRIFIEZ CES ÉLÉMENTS DANS LE PAYLOAD:');
console.log('   ✅ "role": doit être "DIRECTOR"');
console.log('   ✅ "email": votre email de directeur');
console.log('   ✅ "exp": date d\'expiration (timestamp Unix)');
console.log('   ✅ "iat": date de création (timestamp Unix)');
console.log('');

console.log('4️⃣ PROBLÈMES POSSIBLES:');
console.log('   🔍 Token expiré → Reconnectez-vous');
console.log('   🔍 Role incorrect → Vérifiez en base');
console.log('   🔍 Token malformé → Videz localStorage');
console.log('   🔍 Headers manquants → Problème frontend');
console.log('');

console.log('5️⃣ RÔLES AUTORISÉS POUR INVITATIONS:');
console.log('   ✅ DIRECTOR (votre rôle)');
console.log('   ✅ SERVICE_MANAGER');  
console.log('   ✅ ADMIN');
console.log('');

console.log('6️⃣ ACTIONS DE RÉPARATION:');
console.log('   🔧 Si token expiré: Déconnectez-vous et reconnectez-vous');
console.log('   🔧 Si role incorrect: Utilisez Prisma Studio (port 5556)');
console.log('   🔧 Si problème persiste: Videz localStorage complètement');
console.log('');

console.log('💡 COMMANDES UTILES:');
console.log('   → Vider le localStorage: localStorage.clear()');
console.log('   → Voir toutes les clés: Object.keys(localStorage)');
console.log('   → Prisma Studio: déjà ouvert sur http://localhost:5556');
console.log('');

// Fonction helper pour décoder un token manuellement  
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Token malformé (doit avoir 3 parties)');
      return;
    }
    
    // Décoder le payload (partie 2)
    const payload = JSON.parse(atob(parts[1]));
    console.log('🎯 PAYLOAD DÉCODÉ:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Vérifier l'expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;
    
    console.log(`⏰ Expiration: ${new Date(payload.exp * 1000).toLocaleString()}`);
    console.log(`${isExpired ? '❌' : '✅'} Token ${isExpired ? 'EXPIRÉ' : 'VALIDE'}`);
    
    return payload;
  } catch (error) {
    console.log('❌ Erreur décodage:', error.message);
  }
}

console.log('🧪 TESTEZ ICI VOTRE TOKEN:');
console.log('==========================');
console.log('Copiez cette fonction dans la console navigateur:');
console.log('');
console.log(decodeJWT.toString());
console.log('');
console.log('Puis tapez: decodeJWT(localStorage.getItem("token"))');
console.log(''); 