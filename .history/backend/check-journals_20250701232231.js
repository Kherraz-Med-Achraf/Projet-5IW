const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkJournals() {
  try {
    // Récupérer toutes les années scolaires
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { label: 'asc' }
    });
    
    console.log('📚 Années scolaires disponibles :');
    academicYears.forEach(year => {
      console.log(`  - ${year.label} (${year.id})`);
    });
    
    // Récupérer un enfant pour test
    const child = await prisma.child.findFirst({
      include: {
        parent: {
          include: {
            user: true
          }
        }
      }
    });
    
    if (!child) {
      console.log('❌ Aucun enfant trouvé');
      return;
    }
    
    console.log(`\n🧒 Test avec l'enfant : ${child.firstName} ${child.lastName}`);
    
    // Vérifier les journaux pour chaque année scolaire
    for (const year of academicYears) {
      console.log(`\n📅 Année scolaire ${year.label} :`);
      
      const journals = await prisma.journalMensuel.findMany({
        where: {
          childId: child.id,
          academicYearId: year.id
        },
        orderBy: { month: 'asc' }
      });
      
      if (journals.length === 0) {
        console.log('  ❌ Aucun journal trouvé');
        continue;
      }
      
      // Organiser par mois
      const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const monthsPresent = journals.map(j => j.month).sort((a, b) => a - b);
      
      console.log(`  ✅ ${journals.length} journaux trouvés pour les mois : ${monthsPresent.map(m => monthNames[m]).join(', ')}`);
      
      // Vérifier les mois manquants pour l'année scolaire (septembre à août)
      const schoolYearMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
      const missingMonths = schoolYearMonths.filter(m => !monthsPresent.includes(m));
      
      if (missingMonths.length > 0) {
        console.log(`  ⚠️  Mois manquants : ${missingMonths.map(m => monthNames[m]).join(', ')}`);
      }
    }
    
    // Compter tous les journaux
    const totalJournals = await prisma.journalMensuel.count();
    console.log(`\n📊 Total des journaux mensuels dans la base : ${totalJournals}`);
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJournals(); 