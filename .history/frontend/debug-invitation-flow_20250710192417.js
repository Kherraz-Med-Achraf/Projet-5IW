console.log('🔍 DEBUG INVITATION FLOW - Redirection Login');
console.log('============================================');
console.log('');

console.log('📋 COPIEZ ET COLLEZ CE CODE DANS LA CONSOLE NAVIGATEUR (F12):');
console.log('==============================================================');
console.log('');

const debugCode = `
// 🔍 DIAGNOSTIC COMPLET DU FLUX D'INVITATION
console.clear();
console.log('🔍 DIAGNOSTIC INVITATION FLOW');
console.log('=============================');
console.log('');

// 1. Vérifier l'URL et le token
console.log('1️⃣ URL ET TOKEN:');
console.log('   URL actuelle:', window.location.href);
console.log('   Token dans URL:', new URLSearchParams(window.location.search).get('token'));
console.log('   Route Vue:', window.vm?.$router?.currentRoute?.value || 'Non disponible');
console.log('');

// 2. Vérifier l'état d'authentification
console.log('2️⃣ AUTHENTIFICATION:');
console.log('   Token localStorage:', localStorage.getItem('token') ? '✅ Présent' : '❌ Absent');
console.log('   User localStorage:', localStorage.getItem('user') ? '✅ Présent' : '❌ Absent');
console.log('   Auth store (si disponible):', window.auth?.isAuthenticated || 'Non disponible');
console.log('');

// 3. Vérifier le store d'inscription (Pinia)
try {
  console.log('3️⃣ REGISTER STORE:');
  console.log('   Token invitation:', window.registerStore?.inviteToken || 'Non disponible');
  console.log('   Email form:', window.registerStore?.form?.email || 'Non disponible');
  console.log('   Form complet:', window.registerStore?.form || 'Non disponible');
  console.log('   Étape 1 complète:', window.registerStore?.isStepOneComplete?.() || 'Non disponible');
  console.log('   Peut accéder étape 2:', window.registerStore?.canAccessStep?.(2) || 'Non disponible');
  console.log('');
} catch (e) {
  console.log('❌ Erreur accès register store:', e.message);
}

// 4. Vérifier les cookies et CSRF
console.log('4️⃣ COOKIES ET CSRF:');
const cookies = document.cookie.split(';').reduce((acc, cookie) => {
  const [name, value] = cookie.trim().split('=');
  acc[name] = value;
  return acc;
}, {});
console.log('   Cookies:', cookies);
console.log('   CSRF token:', cookies.csrf_token || 'Absent');
console.log('');

// 5. Tester la validation du token
console.log('5️⃣ TEST VALIDATION TOKEN:');
const urlToken = new URLSearchParams(window.location.search).get('token');
if (urlToken) {
  console.log('   Token trouvé:', urlToken.substring(0, 20) + '...');
  
  // Test de validation
  fetch('/api/invitations/validate/' + urlToken)
    .then(response => {
      console.log('   Status HTTP:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('   Réponse validation:', data);
    })
    .catch(error => {
      console.log('   Erreur validation:', error.message);
    });
} else {
  console.log('   ❌ Aucun token dans l\\'URL');
}

// 6. Navigation et routing
console.log('6️⃣ NAVIGATION:');
console.log('   Hash:', window.location.hash);
console.log('   Pathname:', window.location.pathname);
console.log('   Search params:', window.location.search);
console.log('');

// 7. Intercepter les redirections
const originalPush = window.history.pushState;
window.history.pushState = function(state, title, url) {
  console.log('🔄 REDIRECTION DÉTECTÉE:', url);
  console.trace('Stack trace de la redirection:');
  return originalPush.apply(this, arguments);
};

console.log('✅ Diagnostic terminé. Tentez maintenant de passer au step 2.');
console.log('   Les redirections seront loggées ci-dessus.');
`;

console.log(debugCode);

console.log('');
console.log('🎯 PROBLÈMES IDENTIFIÉS:');
console.log('========================');
console.log('1. Synchronisation form local ↔ store global');
console.log('2. Validation isStepOneComplete() peut échouer');
console.log('3. Token d\'invitation peut être perdu en navigation');
console.log('4. Guard router peut rediriger vers login');
console.log('');

console.log('🔧 SOLUTIONS:');
console.log('=============');
console.log('1. Vérifier si le form StepOne est bien synchronisé');
console.log('2. S\'assurer que le token reste dans l\'URL');
console.log('3. Vérifier que validation du token ne fail pas');
console.log('4. Debug les conditions canAccessStep(2)');
console.log('');

console.log('📱 INSTRUCTIONS:');
console.log('================');
console.log('1. Copiez le code JavaScript ci-dessus');
console.log('2. Allez sur le step 1 de l\'inscription');
console.log('3. Ouvrez la console (F12)');
console.log('4. Collez et exécutez le code');
console.log('5. Remplissez le step 1 et tentez d\'aller au step 2');
console.log('6. Regardez les logs pour identifier le problème exact');
console.log(''); 