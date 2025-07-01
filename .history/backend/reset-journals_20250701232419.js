const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetJournals() {
  try {
    console.log('🗑️  Suppression des journaux mensuels existants...');
    
    // Supprimer d'abord les attachments (foreign key)
    await prisma.journalAttachment.deleteMany({});
    console.log('   ✅ Attachments supprimés');
    
    // Puis supprimer les journaux
    const deletedCount = await prisma.journalMensuel.deleteMany({});
    console.log(`   ✅ ${deletedCount.count} journaux supprimés`);
    
    console.log('🔄 Reset terminé ! Vous pouvez maintenant relancer le seed.');
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetJournals(); 