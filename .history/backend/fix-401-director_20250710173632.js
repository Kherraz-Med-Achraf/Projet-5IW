console.log('🚀 RÉPARATION RAPIDE - 401 Director');
console.log('===================================');
console.log('');

console.log('📋 COPIEZ ET COLLEZ CE CODE DANS LA CONSOLE NAVIGATEUR:');
console.log('========================================================');
console.log('');

const fixScript = `
// 🧹 NETTOYAGE COMPLET
console.log('🧹 Nettoyage du localStorage...');
Object.keys(localStorage).forEach(key => {
  if (key.includes('token') || key.includes('auth') || key.includes('user')) {
    console.log('🗑️ Suppression:', key);
    localStorage.removeItem(key);
  }
});

// 🍪 NETTOYAGE DES COOKIES
console.log('🍪 Nettoyage des cookies...');
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// 📊 VÉRIFICATION FINALE
console.log('📊 État après nettoyage:');
console.log('   localStorage keys:', Object.keys(localStorage));
console.log('   Cookies:', document.cookie);

// ✅ INSTRUCTIONS
console.log('');
console.log('✅ MAINTENANT:');
console.log('1. Actualisez la page (F5)');
console.log('2. Reconnectez-vous avec votre compte DIRECTOR');
console.log('3. Retentez de créer une invitation');
console.log('');
console.log('🎯 Si le problème persiste, vérifiez votre rôle en base de données');
`;

console.log(fixScript);

console.log('');
console.log('🔍 ALTERNATIVE - VÉRIFICATION RÔLE EN BASE:');
console.log('===========================================');
console.log('Si le nettoyage ne fonctionne pas:');
console.log('');
console.log('1. Ouvrez Prisma Studio: http://localhost:5556');
console.log('2. Allez dans la table "User"');
console.log('3. Cherchez votre email');
console.log('4. Vérifiez que le champ "role" = "DIRECTOR"');
console.log('5. Si différent, modifiez-le et sauvegardez');
console.log('');

console.log('🎯 AUTRES VÉRIFICATIONS:');
console.log('========================');
console.log('• emailVerified doit être true');
console.log('• passwordChangedAt récent peut invalider les tokens');
console.log('• Vérifiez qu\'il existe un DirectorProfile lié');
console.log(''); 