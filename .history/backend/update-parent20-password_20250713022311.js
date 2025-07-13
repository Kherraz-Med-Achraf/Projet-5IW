const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateParent20Password() {
  try {
    // Vérifier si parent20 existe
    const parent20 = await prisma.user.findUnique({
      where: { email: 'parent20@example.com' },
    });

    if (!parent20) {
      console.log('❌ Parent20 non trouvé');
      return;
    }

    // Mettre à jour la date de changement de mot de passe pour qu'elle soit expirée
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 65); // 65 jours en arrière (> 60 jours)
    
    await prisma.user.update({
      where: { email: 'parent20@example.com' },
      data: {
        passwordChangedAt: expiredDate,
      },
    });

    console.log('✅ Parent20 mis à jour avec mot de passe EXPIRÉ');
    console.log('📅 Date de changement:', expiredDate.toISOString());
    console.log('🔑 Credentials: parent20@example.com / Test1234!!!!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateParent20Password(); 