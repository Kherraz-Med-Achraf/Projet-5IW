const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://myuser:mypassword@localhost:5433/mydb'
    }
  }
});

async function debugParent1() {
  try {
    console.log('=== Analyse de parent1@example.com ===');
    
    // Trouver l'utilisateur parent1@example.com
    const user = await prisma.user.findUnique({
      where: { email: 'parent1@example.com' },
      include: {
        parentProfile: {
          include: {
            children: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Utilisateur parent1@example.com introuvable');
      return;
    }

    console.log(`✅ Utilisateur trouvé:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rôle: ${user.role}`);

    if (user.parentProfile) {
      console.log(`   Profil parent ID: ${user.parentProfile.id}`);
      console.log(`   Nom: ${user.parentProfile.firstName} ${user.parentProfile.lastName}`);
      console.log(`   Enfants (${user.parentProfile.children.length}):`);
      user.parentProfile.children.forEach(child => {
        console.log(`   - ID ${child.id}: ${child.firstName} ${child.lastName}`);
      });
    } else {
      console.log('❌ Aucun profil parent trouvé');
    }

    // Vérifier s'il y a d'autres utilisateurs avec un profil parent similaire
    console.log('\n=== Tous les profils parents ===');
    const allParents = await prisma.parentProfile.findMany({
      include: {
        user: true,
        children: true
      },
      orderBy: { id: 'asc' }
    });

    allParents.forEach(parent => {
      console.log(`Parent ${parent.id}: ${parent.firstName} ${parent.lastName} (${parent.user.email}) - ${parent.children.length} enfant(s)`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugParent1(); 