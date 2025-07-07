const { PrismaClient } = require('@prisma/client');

async function createTodaySheet() {
  const prisma = new PrismaClient();
  
  try {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log(`📅 Création de la feuille pour: ${todayDate.toLocaleDateString('fr-FR')}`);
    
    // Vérifier si la feuille existe déjà
    const exists = await prisma.presenceSheet.findUnique({
      where: { date: todayDate },
      include: { records: true },
    });
    
    if (exists) {
      console.log(`✅ Feuille existe déjà avec ${exists.records.length} enfants`);
      return;
    }
    
    // Créer la feuille
    const sheet = await prisma.presenceSheet.create({
      data: {
        date: todayDate,
        staffId: null,
        status: 'PENDING_STAFF',
      },
    });
    
    // Ajouter tous les enfants
    const children = await prisma.child.findMany();
    await prisma.presenceRecord.createMany({
      data: children.map((c) => ({
        sheetId: sheet.id,
        childId: c.id,
        present: false,
      })),
    });
    
    console.log(`✅ Feuille créée avec ${children.length} enfants`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTodaySheet(); 