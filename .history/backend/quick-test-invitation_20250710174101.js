console.log('🧪 TEST RAPIDE - Format Invitation');
console.log('==================================');
console.log('');

console.log('📋 UTILISEZ CE CODE DANS LA CONSOLE NAVIGATEUR:');
console.log('===============================================');
console.log('');

const testCode = `
// 🧪 Fonction de test pour invitation
function testInvitation(email, roleToAssign) {
  console.log('🔍 Test validation invitation:');
  console.log('==============================');
  
  // Validation email
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  const isValidEmail = emailRegex.test(email);
  console.log('📧 Email:', email);
  console.log('✅ Email valide:', isValidEmail);
  
  // Validation rôle
  const validRoles = ['USER', 'ADMIN', 'TEACHER', 'CHILD', 'PARENT', 'SECRETARY', 'DIRECTOR', 'SERVICE_MANAGER', 'STAFF'];
  const isValidRole = validRoles.includes(roleToAssign);
  console.log('🎭 Rôle:', roleToAssign);
  console.log('✅ Rôle valide:', isValidRole);
  
  // Payload final
  const payload = { email, roleToAssign };
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  // Validation globale
  const isValid = isValidEmail && isValidRole;
  console.log('');
  console.log(isValid ? '✅ DONNÉES VALIDES' : '❌ DONNÉES INVALIDES');
  
  return { isValid, payload };
}

// Tests prédéfinis
console.log('🧪 Tests automatiques:');
console.log('======================');
testInvitation('test@example.com', 'PARENT');
testInvitation('invalid-email', 'PARENT');
testInvitation('test@example.com', 'InvalidRole');

console.log('');
console.log('🔧 Testez vos données:');
console.log('======================');
console.log('testInvitation("votre-email@exemple.com", "PARENT")');
`;

console.log(testCode);

console.log('');
console.log('🔍 ÉTAPES DE DIAGNOSTIC:');
console.log('========================');
console.log('');
console.log('1️⃣ Copiez le code ci-dessus dans la console (F12)');
console.log('2️⃣ Testez avec vos données réelles');
console.log('3️⃣ Si validation OK, le problème est côté backend');
console.log('4️⃣ Si validation KO, corrigez les données');
console.log('');

console.log('💡 TESTS SPÉCIFIQUES:');
console.log('=====================');
console.log('// Test email valide mais peut-être déjà utilisé');
console.log('testInvitation("nouveau@test.com", "PARENT")');
console.log('');
console.log('// Test avec différents rôles');
console.log('testInvitation("test@example.com", "STAFF")');
console.log('testInvitation("test@example.com", "SECRETARY")');
console.log('');

console.log('🎯 SI VALIDATION FRONTEND OK:');
console.log('=============================');
console.log('Alors le problème est côté backend:');
console.log('• Email déjà enregistré en base');
console.log('• Invitation existante non expirée');
console.log('• Problème de transformation des données');
console.log('');

console.log('🛠️ SOLUTION RAPIDE - NETTOYAGE BASE:');
console.log('====================================');
console.log('Si vous voulez nettoyer les invitations existantes:');
console.log('1. Ouvrez Prisma Studio: http://localhost:5556');
console.log('2. Table "Invitation" → Supprimez les invitations test');
console.log('3. Table "User" → Vérifiez qu\'aucun utilisateur avec cet email existe');
console.log(''); 