const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://myuser:mypassword@localhost:5433/mydb'
    }
  }
});

async function checkSpecificIds() {
  try {
    console.log('=== Vérification des enfants IDs 1, 31, 61 ===');
    
    const targetIds = [1, 31, 61];
    
    for (const id of targetIds) {
      const child = await prisma.child.findUnique({
        where: { id },
        include: {
          parent: {
            include: {
              user: true
            }
          }
        }
      });
      
      if (child) {
        console.log(`Enfant ID ${id}:`);
        console.log(`  Nom: ${child.firstName} ${child.lastName}`);
        console.log(`  Parent ID: ${child.parentProfileId}`);
        console.log(`  Parent nom: ${child.parent.firstName} ${child.parent.lastName}`);
        console.log(`  Parent email: ${child.parent.user.email}`);
        console.log('');
      } else {
        console.log(`❌ Enfant ID ${id} n'existe pas`);
      }
    }

    // Compter le total d'enfants
    const totalChildren = await prisma.child.count();
    console.log(`📊 Total enfants en base: ${totalChildren}`);

    // Compter les enfants par profil parent
    const childrenByParent = await prisma.child.groupBy({
      by: ['parentProfileId'],
      _count: {
        id: true
      },
      orderBy: {
        parentProfileId: 'asc'
      }
    });

    console.log('\n=== Enfants par profil parent ===');
    childrenByParent.forEach(group => {
      console.log(`Parent ${group.parentProfileId}: ${group._count.id} enfant(s)`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificIds(); 