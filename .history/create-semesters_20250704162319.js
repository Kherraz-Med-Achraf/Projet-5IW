// Script simple pour créer des semestres de test
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSemesters() {
  try {
    console.log('🌱 Création des semestres de test...');

    // Créer les semestres s'ils n'existent pas
    const semesters = [
      {
        name: '2024-2025 S1',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-01-31')
      },
      {
        name: '2024-2025 S2', 
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-08-31')
      },
      {
        name: '2025-2026 S1',
        startDate: new Date('2025-09-01'), 
        endDate: new Date('2026-01-31')
      },
      {
        name: '2025-2026 S2',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-08-31')
      }
    ];

    for (const semesterData of semesters) {
      const existing = await prisma.semester.findFirst({
        where: { name: semesterData.name }
      });

      if (!existing) {
        const semester = await prisma.semester.create({
          data: semesterData
        });
        console.log(`✅ Semestre créé: ${semester.name}`);
      } else {
        console.log(`ℹ️  Semestre existe déjà: ${semesterData.name}`);
      }
    }

    // Afficher tous les semestres
    const allSemesters = await prisma.semester.findMany({
      orderBy: { startDate: 'asc' }
    });

    console.log('\n📅 Semestres disponibles:');
    allSemesters.forEach(sem => {
      console.log(`  - ${sem.name}: ${sem.startDate.toLocaleDateString('fr-FR')} → ${sem.endDate.toLocaleDateString('fr-FR')}`);
    });

    console.log(`\n🎯 Total: ${allSemesters.length} semestres`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSemesters(); 