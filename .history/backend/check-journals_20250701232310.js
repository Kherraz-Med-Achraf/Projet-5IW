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
    
    // Récupérer l'enfant Norma Bergnaum spécifiquement
    const child = await prisma.child.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'Norma', mode: 'insensitive' } },
          { lastName: { contains: 'Bergnaum', mode: 'insensitive' } }
        ]
      },
      include: {
        parent: {
          include: {
            user: true
          }
        }
      }
    });
    
    if (!child) {
      console.log('❌ Enfant "Norma Bergnaum" non trouvé');
      
      // Afficher tous les enfants disponibles
      const allChildren = await prisma.child.findMany({
        take: 10,
        select: { firstName: true, lastName: true, id: true }
      });
      console.log('\n🧒 Premiers enfants disponibles :');
      allChildren.forEach(c => {
        console.log(`  - ${c.firstName} ${c.lastName} (${c.id})`);
      });
      return;
    }
    
    console.log(`\n🧒 Test avec l'enfant : ${child.firstName} ${child.lastName} (ID: ${child.id})`);
    
    // Récupérer l'année scolaire 2023-2024
    const year2023 = academicYears.find(y => y.label === '2023-2024');
    if (!year2023) {
      console.log('❌ Année scolaire 2023-2024 non trouvée');
      return;
    }
    
    console.log(`\n📅 Année scolaire 2023-2024 (ID: ${year2023.id}) :`);
    
    const journals = await prisma.journalMensuel.findMany({
      where: {
        childId: child.id,
        academicYearId: year2023.id
      },
      orderBy: { month: 'asc' },
      include: {
        educator: {
          include: {
            staffProfile: true
          }
        }
      }
    });
    
    console.log(`📊 Nombre total de journaux pour cet enfant en 2023-2024 : ${journals.length}`);
    
    if (journals.length === 0) {
      console.log('  ❌ Aucun journal trouvé pour cet enfant en 2023-2024');
      
      // Vérifier s'il y a des missions pour cet enfant
      const missions = await prisma.mission.findMany({
        where: {
          childId: child.id,
          academicYearId: year2023.id
        }
      });
      console.log(`  📝 Missions pour cet enfant en 2023-2024 : ${missions.length}`);
      
      return;
    }
    
    // Organiser par mois dans l'ordre scolaire (septembre → août)
    const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const schoolYearOrder = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]; // septembre → août
    
    console.log('\n📅 Détail des journaux par mois (ordre scolaire) :');
    
    for (const month of schoolYearOrder) {
      const journal = journals.find(j => j.month === month);
      if (journal) {
        const status = journal.isDraft ? 'DRAFT' : (journal.isSubmitted ? 'SUBMITTED' : 'CREATED');
        const educator = journal.educator?.staffProfile ? 
          `${journal.educator.staffProfile.firstName} ${journal.educator.staffProfile.lastName}` : 
          'Éducateur non défini';
        console.log(`  ✅ ${monthNames[month].padEnd(10)} : ${status.padEnd(10)} | Éducateur: ${educator}`);
      } else {
        console.log(`  ❌ ${monthNames[month].padEnd(10)} : MANQUANT`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJournals(); 