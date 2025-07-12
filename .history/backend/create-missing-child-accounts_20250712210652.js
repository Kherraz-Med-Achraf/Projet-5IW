const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createMissingChildAccounts() {
  console.log('🔍 Recherche des enfants sans compte User...');
  
  // Trouver tous les enfants sans userId
  const childrenWithoutUser = await prisma.child.findMany({
    where: {
      userId: null,
    },
    include: {
      parent: {
        include: {
          user: true,
        },
      },
    },
  });
  
  console.log(`📊 Trouvé ${childrenWithoutUser.length} enfants sans compte User`);
  
  if (childrenWithoutUser.length === 0) {
    console.log('✅ Tous les enfants ont déjà leurs comptes User');
    return;
  }
  
  const defaultPassword = process.env.CHILD_DEFAULT_PASSWORD || 'child1234';
  
  for (const child of childrenWithoutUser) {
    try {
      // Générer un login unique
      const base = `${child.firstName[0].toLowerCase()}${child.lastName.toLowerCase()}`;
      let login = base;
      let suffix = 1;
      
      while (await prisma.user.findUnique({ where: { email: `${login}@kids.local` } })) {
        login = `${base}_${suffix++}`;
      }
      
      // Créer le compte User
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const user = await prisma.user.create({
        data: {
          email: `${login}@kids.local`,
          password: hashedPassword,
          role: Role.CHILD,
          emailVerified: true,
        },
      });
      
      // Lier l'enfant au compte User
      await prisma.child.update({
        where: { id: child.id },
        data: { userId: user.id },
      });
      
      console.log(`✅ Créé compte pour ${child.firstName} ${child.lastName} → ${login}@kids.local`);
      
      // Envoyer email au parent avec les identifiants
      if (child.parent?.user?.email) {
        console.log(`📧 Email à envoyer au parent: ${child.parent.user.email}`);
        console.log(`   Identifiants: ${login}@kids.local / ${defaultPassword}`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur pour ${child.firstName} ${child.lastName}:`, error.message);
    }
  }
  
  console.log('✅ Terminé !');
}

async function main() {
  try {
    await createMissingChildAccounts();
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 