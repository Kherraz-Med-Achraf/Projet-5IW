const { PrismaClient } = require('@prisma/client');

// Configuration pour charger les variables d'environnement comme en production
require('dotenv').config();

// Construire l'URL de la base comme NestJS le fait
const postgresHost = process.env.POSTGRES_HOST || 'localhost';
const postgresPort = process.env.POSTGRES_PORT || '5433';
const postgresUser = process.env.POSTGRES_USER || 'myuser';
const postgresPassword = process.env.POSTGRES_PASSWORD || 'mypassword';
const postgresDb = process.env.POSTGRES_DB || 'mydb';

const databaseUrl = `postgresql://${postgresUser}:${postgresPassword}@${postgresHost}:${postgresPort}/${postgresDb}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function createTodayPresenceSheet() {
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay();
  
  console.log(`📅 [TEST] Création de la feuille pour aujourd'hui: ${todayDate.toISOString().substring(0, 10)} (jour ${dayOfWeek})`);
  
  // Ignorer les dimanches (jour 0) car c'est généralement fermé
  if (dayOfWeek === 0) {
    console.log('⏸️  [TEST] Dimanche détecté, pas de feuille créée');
    return;
  }

  // Vérifier si une feuille existe déjà pour aujourd'hui
  const existingSheet = await prisma.presenceSheet.findFirst({
    where: {
      date: {
        gte: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()),
        lt: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1),
      },
    },
  });

  if (existingSheet) {
    console.log(`🔄 [TEST] Feuille déjà existante pour aujourd'hui (ID: ${existingSheet.id})`);
    return;
  }

  // Récupérer tous les enfants actifs
  const children = await prisma.child.findMany({
    select: { id: true, firstName: true, lastName: true },
  });

  if (children.length === 0) {
    console.log('⚠️ [TEST] Aucun enfant trouvé dans la base de données');
    return;
  }

  // Créer la feuille de présence avec tous les enfants par défaut absents
  const newSheet = await prisma.presenceSheet.create({
    data: {
      date: todayDate,
      status: 'PENDING_STAFF',
      records: {
        create: children.map((child) => ({
          childId: child.id,
          present: false, // Par défaut, tous les enfants sont marqués absents
        })),
      },
    },
    include: { records: true },
  });

  console.log(`🎉 [TEST] Feuille créée avec succès (ID: ${newSheet.id}) avec ${newSheet.records.length} enfants`);
}

async function testPresenceCron() {
  console.log('🚀 [TEST] Démarrage du test de création des feuilles de présence');
  console.log('🔗 [TEST] URL de la base:', databaseUrl);
  
  try {
    await createTodayPresenceSheet();
    console.log('✅ [TEST] Test terminé avec succès');
  } catch (error) {
    console.error('❌ [TEST] Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPresenceCron(); 