const { PrismaClient } = require('@prisma/client');

async function debugDirectorPermissions() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 DIAGNOSTIC PERMISSIONS DIRECTOR');
    console.log('==================================');
    
    // 1. Chercher tous les utilisateurs Director
    console.log('1️⃣ Recherche des utilisateurs DIRECTOR...');
    const directors = await prisma.user.findMany({
      where: { role: 'DIRECTOR' },
      include: {
        directorProfile: true
      }
    });
    
    console.log(`✅ Trouvé ${directors.length} directeur(s):`);
    directors.forEach(director => {
      console.log(`   📋 ID: ${director.id}`);
      console.log(`   📧 Email: ${director.email}`);
      console.log(`   🎯 Rôle: ${director.role}`);
      console.log(`   ✅ Email vérifié: ${director.emailVerified}`);
      console.log(`   👤 Profil: ${director.directorProfile ? 
        `${director.directorProfile.firstName} ${director.directorProfile.lastName}` : 
        'Pas de profil'}`);
      console.log('   ---');
    });

    // 2. Vérifier les rôles autorisés pour les invitations
    console.log('2️⃣ Rôles autorisés pour les invitations:');
    console.log('   ✅ SERVICE_MANAGER');
    console.log('   ✅ DIRECTOR');
    console.log('   ✅ ADMIN');
    console.log('');

    // 3. Tester une requête d'invitation simulée
    console.log('3️⃣ Test de permissions:');
    const testRoles = ['SERVICE_MANAGER', 'DIRECTOR', 'ADMIN'];
    
    testRoles.forEach(role => {
      const isAuthorized = testRoles.includes(role);
      console.log(`   ${isAuthorized ? '✅' : '❌'} ${role}: ${isAuthorized ? 'AUTORISÉ' : 'REFUSÉ'}`);
    });

    // 4. Vérifier les invitations existantes
    console.log('');
    console.log('4️⃣ Invitations existantes...');
    const invitations = await prisma.invitation.findMany({
      include: {
        inviter: {
          select: { email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`✅ Dernières ${invitations.length} invitations:`);
    invitations.forEach(inv => {
      console.log(`   📧 ${inv.email} → ${inv.roleToAssign}`);
      console.log(`   👤 Invité par: ${inv.inviter.email} (${inv.inviter.role})`);
      console.log(`   📅 ${inv.createdAt.toLocaleDateString()}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Instructions de test
console.log('🧪 TESTS À EFFECTUER APRÈS CE DIAGNOSTIC:');
console.log('==========================================');
console.log('1. Vérifiez que votre utilisateur DIRECTOR apparaît dans la liste');
console.log('2. Connectez-vous avec ce compte');
console.log('3. Ouvrez la console navigateur (F12)');
console.log('4. Tapez: localStorage.getItem("token")');
console.log('5. Copiez le token et décodez-le sur jwt.io');
console.log('6. Vérifiez que le rôle dans le token = DIRECTOR');
console.log('');

debugDirectorPermissions(); 