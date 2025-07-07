const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTodaySheet() {
  try {
    // Date d'aujourd'hui
    const today = new Date('2025-07-05'); // 5 juillet 2025
    today.setHours(0, 0, 0, 0); // Minuit pour comparaison

    console.log('🔍 Recherche de la feuille du', today.toISOString().split('T')[0]);

    // Trouver la feuille d'aujourd'hui
    const todaySheet = await prisma.presenceSheet.findFirst({
      where: {
        date: today
      },
      include: {
        records: true
      }
    });

    if (!todaySheet) {
      console.log('❌ Aucune feuille trouvée pour aujourd\'hui');
      return;
    }

    console.log(`📋 Feuille trouvée: ID ${todaySheet.id} avec ${todaySheet.records.length} enregistrements`);

    if (todaySheet.records.length === 0) {
      console.log('🗑️ Suppression de la feuille vide...');
      
      // Supprimer la feuille vide
      await prisma.presenceSheet.delete({
        where: { id: todaySheet.id }
      });

      console.log('✅ Feuille vide supprimée');

      // Récupérer tous les enfants
      const children = await prisma.child.findMany();
      console.log(`👶 ${children.length} enfants trouvés dans la base`);

      if (children.length > 0) {
        // Créer une nouvelle feuille avec tous les enfants
        const newSheet = await prisma.presenceSheet.create({
          data: {
            date: today,
            staffId: null, // Système automatique
            status: 'PENDING_STAFF'
          }
        });

        // Créer les enregistrements pour tous les enfants
        const records = children.map(child => ({
          sheetId: newSheet.id,
          childId: child.id,
          present: false // Par défaut absent
        }));

        await prisma.presenceRecord.createMany({
          data: records
        });

        console.log(`✅ Nouvelle feuille créée (ID: ${newSheet.id}) avec ${children.length} enfants`);
      } else {
        console.log('❌ Aucun enfant trouvé pour créer la feuille');
      }
    } else {
      console.log(`✅ La feuille contient déjà ${todaySheet.records.length} enregistrements, pas besoin de correction`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTodaySheet(); 