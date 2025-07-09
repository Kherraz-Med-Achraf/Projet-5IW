const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://myuser:mypassword@localhost:5433/mydb'
    }
  }
});

async function debugChildren() {
  try {
    console.log('=== Enfants des 3 premiers parents ===');
    
    const parentsWithChildren = await prisma.parentProfile.findMany({
      where: { id: { in: [1, 2, 3] } },
      include: {
        children: true,
        user: true
      },
      orderBy: { id: 'asc' }
    });

    parentsWithChildren.forEach(parent => {
      console.log(`\n📧 Parent ${parent.id}: ${parent.firstName} ${parent.lastName} (${parent.user.email})`);
      console.log(`   Nombre d'enfants: ${parent.children.length}`);
      parent.children.forEach(child => {
        console.log(`   - ID ${child.id}: ${child.firstName} ${child.lastName} (parent: ${child.parentProfileId})`);
      });
    });

    // Compter les enfants par nom
    console.log('\n=== Analyse des doublons ===');
    const allChildren = await prisma.child.findMany({
      orderBy: { id: 'asc' }
    });

    const childrenByName = {};
    allChildren.forEach(child => {
      const fullName = `${child.firstName} ${child.lastName}`;
      if (!childrenByName[fullName]) {
        childrenByName[fullName] = [];
      }
      childrenByName[fullName].push(child);
    });

    Object.entries(childrenByName).forEach(([name, children]) => {
      if (children.length > 1) {
        console.log(`\n🔥 DOUBLON: ${name} (${children.length} occurrences)`);
        children.forEach(child => {
          console.log(`   - ID ${child.id}, parent: ${child.parentProfileId}`);
        });
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugChildren(); 