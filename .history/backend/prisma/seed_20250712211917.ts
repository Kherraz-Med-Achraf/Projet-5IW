import { PrismaClient, Role, Discipline, Child } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

// Assurer un comportement déterministe
faker.seed(123456);

const prisma = new PrismaClient();
const HASH_ROUNDS = 10;
const DEFAULT_PWD = 'Test1234!!!!';
// Sel statique pour produire un hash constant
const STATIC_SALT = '$2b$10$C6UzMDM.H6dfI/f/IKcEe.';
const DEFAULT_HASHED_PWD = bcrypt.hashSync(DEFAULT_PWD, STATIC_SALT);

async function hash(pwd: string) {
  // Retourne toujours le même hash pour DEFAULT_PWD
  if (pwd === DEFAULT_PWD) return DEFAULT_HASHED_PWD;
  return bcrypt.hash(pwd, STATIC_SALT);
}

/* Helpers ----------------------------------------------------------------- */
function initialEmail(first: string, last: string, index = 0) {
  const base = `${first[0].toLowerCase()}${last.toLowerCase()}`;
  return index ? `${base}${index}@gmail.com` : `${base}@gmail.com`;
}

async function uniqueStaffEmail(first: string, last: string) {
  let idx = 0;
  const maxAttempts = 100; // Prévenir les boucles infinies
  
  while (idx < maxAttempts) {
    const mail = initialEmail(first, last, idx);
    const exists = await prisma.user.findUnique({ where: { email: mail } });
    if (!exists) return mail;
    idx += 1;
  }
  
  throw new Error(`Impossible de générer un email unique pour ${first} ${last} après ${maxAttempts} tentatives`);
}

/* Seed -------------------------------------------------------------------- */
async function main() {
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  /* ---------------------------------------------------------------------- */
  /* 🧹 NETTOYAGE COMPLET DE LA BASE DE DONNÉES */
  /* ---------------------------------------------------------------------- */
  console.log('🧹 Nettoyage complet de la base de données...');
  
  // Ordre de suppression respectant les contraintes de clés étrangères
  await prisma.blogReaction.deleteMany({});
  await prisma.blogPost.deleteMany({});
  await prisma.eventRegistrationChild.deleteMany({});
  await prisma.eventRegistration.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.entryChild.deleteMany({});
  await prisma.scheduleEntry.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.absenceJustification.deleteMany({});
  await prisma.presenceRecord.deleteMany({});
  await prisma.presenceSheet.deleteMany({});
  await prisma.journalAttachment.deleteMany({});
  await prisma.journalMensuel.deleteMany({});
  await prisma.mission.deleteMany({});
  await prisma.academicYear.deleteMany({});
  await prisma.child.deleteMany({});
  await prisma.emergencyContact.deleteMany({});
  await prisma.parentProfile.deleteMany({});
  await prisma.staffProfile.deleteMany({});
  await prisma.secretaryProfile.deleteMany({});
  await prisma.directorProfile.deleteMany({});
  await prisma.serviceManagerProfile.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.emailVerification.deleteMany({});
  await prisma.passwordReset.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('✅ Base de données nettoyée complètement');

  /* ---------------------------------------------------------------------- */
  /* 1. ADMIN                                                               */
  /* ---------------------------------------------------------------------- */
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: await hash(DEFAULT_PWD),
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log('✅ Admin créé → admin@example.com / Test1234!!!!');

  /* ---------------------------------------------------------------------- */
  /* 2. DIRECTOR                                                            */
  /* ---------------------------------------------------------------------- */
  const directorMail = 'apajh94.direction@gmail.com';
  const directorUser = await prisma.user.create({
    data: {
      email: directorMail,
      password: await hash(DEFAULT_PWD),
      role: 'DIRECTOR',
      emailVerified: true,
    },
  });
  
  await prisma.directorProfile.create({
    data: {
      userId: directorUser.id,
      firstName: 'Jean',
      lastName: 'Direction',
      phone: '0612345678',
      birthDate: new Date('1975-05-15'),
      jobTitle: 'Directeur',
      startDate: new Date('2019-09-01'),
      profileImage: null,
    },
  });
  console.log('✅ Director créé →', directorUser.email);

  /* ---------------------------------------------------------------------- */
  /* 3. SERVICE_MANAGER x2                                                  */
  /* ---------------------------------------------------------------------- */
  const smMails = ['apajh94.cs@gmail.com', 'apajh94.cs2@gmail.com'];
  const smData = [
    { firstName: 'Marie', lastName: 'Dupont', phone: '0623456789', birthDate: new Date('1980-03-20') },
    { firstName: 'Pierre', lastName: 'Martin', phone: '0634567890', birthDate: new Date('1978-08-12') }
  ];
  
  for (let i = 0; i < smMails.length; i++) {
    const mail = smMails[i];
    const usr = await prisma.user.create({
      data: {
        email: mail,
        password: await hash(DEFAULT_PWD),
        role: 'SERVICE_MANAGER',
        emailVerified: true,
      },
    });
    
    await prisma.serviceManagerProfile.create({
      data: {
        userId: usr.id,
        firstName: smData[i].firstName,
        lastName: smData[i].lastName,
        phone: smData[i].phone,
        jobTitle: 'Chef·fe de service',
        startDate: new Date('2021-09-01'),
        birthDate: smData[i].birthDate,
        profileImage: null,
      },
    });
    console.log('✅ Service-manager créé →', usr.email);
  }

  /* ---------------------------------------------------------------------- */
  /* 4. SECRETARY x1                                                        */
  /* ---------------------------------------------------------------------- */
  const secMail = 'apajh94.secretary@gmail.com';
  const secretaryUser = await prisma.user.create({
    data: {
      email: secMail,
      password: await hash(DEFAULT_PWD),
      role: 'SECRETARY',
      emailVerified: true,
    },
  });
  
  await prisma.secretaryProfile.create({
    data: {
      userId: secretaryUser.id,
      firstName: 'Sophie',
      lastName: 'Moreau',
      phone: '0645678901',
      birthDate: new Date('1985-11-30'),
      specialty: 'Secrétariat général',
      startDate: new Date('2022-01-15'),
      profileImage: null,
    },
  });
  console.log('✅ Secretary créé →', secretaryUser.email);

  /* ---------------------------------------------------------------------- */
  /* 5. STAFF (15 au total)                                                 */
  /* ---------------------------------------------------------------------- */
  type StaffSpec = { qty: number; discipline: Discipline; names: { firstName: string; lastName: string; phone: string; birthDate: Date }[] };
  const staffSpecs: StaffSpec[] = [
    { 
      qty: 7, 
      discipline: 'EDUCATOR',
      names: [
        { firstName: 'Alice', lastName: 'Bernard', phone: '0656789012', birthDate: new Date('1990-01-15') },
        { firstName: 'Lucas', lastName: 'Leroy', phone: '0667890123', birthDate: new Date('1988-06-22') },
        { firstName: 'Emma', lastName: 'Rousseau', phone: '0678901234', birthDate: new Date('1992-03-10') },
        { firstName: 'Hugo', lastName: 'Petit', phone: '0689012345', birthDate: new Date('1987-09-05') },
        { firstName: 'Léa', lastName: 'Garcia', phone: '0690123456', birthDate: new Date('1991-12-18') },
        { firstName: 'Tom', lastName: 'Roux', phone: '0601234567', birthDate: new Date('1989-04-25') },
        { firstName: 'Camille', lastName: 'Blanc', phone: '0612345679', birthDate: new Date('1993-07-13') }
      ]
    },
    { 
      qty: 5, 
      discipline: 'TECH_EDUCATOR',
      names: [
        { firstName: 'Maxime', lastName: 'Fournier', phone: '0623456780', birthDate: new Date('1986-02-28') },
        { firstName: 'Julie', lastName: 'Girard', phone: '0634567891', birthDate: new Date('1990-08-16') },
        { firstName: 'Alex', lastName: 'Morel', phone: '0645678902', birthDate: new Date('1984-11-09') },
        { firstName: 'Sarah', lastName: 'Simon', phone: '0656789013', birthDate: new Date('1992-05-07') },
        { firstName: 'Kevin', lastName: 'Michel', phone: '0667890124', birthDate: new Date('1988-10-21') }
      ]
    },
    { 
      qty: 1, 
      discipline: 'PSYCHOLOGIST',
      names: [
        { firstName: 'Dr. Claire', lastName: 'Dubois', phone: '0678901235', birthDate: new Date('1983-04-14') }
      ]
    },
    { 
      qty: 1, 
      discipline: 'PSYCHIATRIST',
      names: [
        { firstName: 'Dr. François', lastName: 'Lemoine', phone: '0689012346', birthDate: new Date('1979-09-30') }
      ]
    },
    { 
      qty: 1, 
      discipline: 'ORTHOPEDIST',
      names: [
        { firstName: 'Dr. Isabelle', lastName: 'Fabre', phone: '0690123457', birthDate: new Date('1981-12-03') }
      ]
    },
  ];

  const allEducators: string[] = [];

  for (const { qty, discipline, names } of staffSpecs) {
    for (let i = 0; i < qty; i++) {
      const { firstName, lastName, phone, birthDate } = names[i];
      const email = await uniqueStaffEmail(firstName, lastName);

      const usr = await prisma.user.create({
        data: {
          email,
          password: await hash(DEFAULT_PWD),
          role: 'STAFF',
          emailVerified: true,
        },
      });
      
      await prisma.staffProfile.create({
        data: {
          userId: usr.id,
          firstName,
          lastName,
          phone,
          birthDate,
          discipline,
          specialty: discipline === 'EDUCATOR' ? 'Général' : null,
        },
      });

      allEducators.push(usr.id);
    }
    console.log(`✅ ${qty} staff ${discipline} créés`);
  }

  /* ---------------------------------------------------------------------- */
  /* 6. PARENTS + CHILDREN (25 parents : 20 avec 1 enfant + 5 avec 2 enfants) */
  /* ---------------------------------------------------------------------- */
  

  
  // Données prédéfinies pour les familles
  const familyData = [
    // 20 familles avec 1 enfant
    { parentFirstName: 'Marc', parentLastName: 'Dubois', children: [{ firstName: 'Léo', lastName: 'Dubois' }] },
    { parentFirstName: 'Sophie', parentLastName: 'Lefebvre', children: [{ firstName: 'Emma', lastName: 'Lefebvre' }] },
    { parentFirstName: 'Pierre', parentLastName: 'Moreau', children: [{ firstName: 'Lucas', lastName: 'Moreau' }] },
    { parentFirstName: 'Julie', parentLastName: 'Laurent', children: [{ firstName: 'Chloé', lastName: 'Laurent' }] },
    { parentFirstName: 'David', parentLastName: 'Simon', children: [{ firstName: 'Hugo', lastName: 'Simon' }] },
    { parentFirstName: 'Céline', parentLastName: 'Michel', children: [{ firstName: 'Léa', lastName: 'Michel' }] },
    { parentFirstName: 'Thomas', parentLastName: 'Garcia', children: [{ firstName: 'Noah', lastName: 'Garcia' }] },
    { parentFirstName: 'Valérie', parentLastName: 'Roux', children: [{ firstName: 'Manon', lastName: 'Roux' }] },
    { parentFirstName: 'Nicolas', parentLastName: 'Petit', children: [{ firstName: 'Nathan', lastName: 'Petit' }] },
    { parentFirstName: 'Sandrine', parentLastName: 'Durand', children: [{ firstName: 'Camille', lastName: 'Durand' }] },
    { parentFirstName: 'Laurent', parentLastName: 'Leroy', children: [{ firstName: 'Antoine', lastName: 'Leroy' }] },
    { parentFirstName: 'Nathalie', parentLastName: 'Moreau', children: [{ firstName: 'Clara', lastName: 'Moreau' }] },
    { parentFirstName: 'Stéphane', parentLastName: 'Fournier', children: [{ firstName: 'Maxime', lastName: 'Fournier' }] },
    { parentFirstName: 'Isabelle', parentLastName: 'Girard', children: [{ firstName: 'Sarah', lastName: 'Girard' }] },
    { parentFirstName: 'Philippe', parentLastName: 'Bonnet', children: [{ firstName: 'Tom', lastName: 'Bonnet' }] },
    { parentFirstName: 'Christine', parentLastName: 'Dupont', children: [{ firstName: 'Julie', lastName: 'Dupont' }] },
    { parentFirstName: 'François', parentLastName: 'Lambert', children: [{ firstName: 'Théo', lastName: 'Lambert' }] },
    { parentFirstName: 'Corinne', parentLastName: 'Fontaine', children: [{ firstName: 'Inès', lastName: 'Fontaine' }] },
    { parentFirstName: 'Olivier', parentLastName: 'Rousseau', children: [{ firstName: 'Paul', lastName: 'Rousseau' }] },
    { parentFirstName: 'Martine', parentLastName: 'Vincent', children: [{ firstName: 'Lola', lastName: 'Vincent' }] },
    
    // 5 familles avec 2 enfants
    { 
      parentFirstName: 'Alain', 
      parentLastName: 'Bernard', 
      children: [
        { firstName: 'Mathis', lastName: 'Bernard' },
        { firstName: 'Zoé', lastName: 'Bernard' }
      ]
    },
    { 
      parentFirstName: 'Catherine', 
      parentLastName: 'Thomas', 
      children: [
        { firstName: 'Ethan', lastName: 'Thomas' },
        { firstName: 'Anaïs', lastName: 'Thomas' }
      ]
    },
    { 
      parentFirstName: 'Jean-Marc', 
      parentLastName: 'Robert', 
      children: [
        { firstName: 'Gabriel', lastName: 'Robert' },
        { firstName: 'Louise', lastName: 'Robert' }
      ]
    },
    { 
      parentFirstName: 'Sylvie', 
      parentLastName: 'Richard', 
      children: [
        { firstName: 'Raphaël', lastName: 'Richard' },
        { firstName: 'Margot', lastName: 'Richard' }
      ]
    },
    { 
      parentFirstName: 'Frédéric', 
      parentLastName: 'Blanc', 
      children: [
        { firstName: 'Alexis', lastName: 'Blanc' },
        { firstName: 'Jade', lastName: 'Blanc' }
      ]
    }
  ];

  const allChildren: Child[] = [];

  for (let f = 0; f < familyData.length; f++) {
    const family = familyData[f];
    const email = `parent${f + 1}@example.com`;

    const usr = await prisma.user.create({
      data: {
        email,
        password: await hash(DEFAULT_PWD),
        role: 'PARENT',
        emailVerified: true,
      },
    });
    
    const parentProfile = await prisma.parentProfile.create({
      data: {
        userId: usr.id,
        firstName: family.parentFirstName,
        lastName: family.parentLastName,
        phone: `06${String(f + 1).padStart(8, '0')}`,
        address: `${f + 1} rue de la Paix, 94000 Créteil`,
        legalResponsibility: 'Père/Mère',
      },
    });

    // Créer les enfants
    for (const childData of family.children) {
      const child = await prisma.child.create({
        data: {
          firstName: childData.firstName,
          lastName: childData.lastName,
          birthDate: new Date(2010 + (f % 5), (f % 12), 1 + (f % 28)),
          parentProfileId: parentProfile.id,
        },
      });
      allChildren.push(child);
    }

    // Créer le contact d'urgence
    await prisma.emergencyContact.create({
      data: {
        parentProfileId: parentProfile.id,
        name: `Contact${f + 1} Urgence`,
        phone: `07${String(f + 1).padStart(8, '0')}`,
        relation: 'Tante',
      },
    });
  }
  console.log('✅ 25 Parents + 30 enfants + contacts d\'urgence créés');

  // Années scolaires et semestres
  const academicYears = [
    { label: '2023-2024', startDate: new Date('2023-09-01'), endDate: new Date('2024-07-31') },
    { label: '2024-2025', startDate: new Date('2024-09-01'), endDate: new Date('2025-07-31') },
    { label: '2025-2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-07-31') },
  ];

  for (const year of academicYears) {
    const yr = await prisma.academicYear.create({
      data: year,
    });

    const sem1Name = `Semestre 1 ${year.label}`;
    const sem2Name = `Semestre 2 ${year.label}`;
    
    await prisma.semester.create({
      data: {
        name: sem1Name,
        startDate: yr.startDate,
        endDate: new Date(yr.startDate.getFullYear() + 1, 1, 31),
      },
    });

    await prisma.semester.create({
      data: {
        name: sem2Name,
        startDate: new Date(yr.startDate.getFullYear() + 1, 1, 1),
        endDate: yr.endDate,
      },
    });
  }

  // Assignation des référents (2-5 enfants par éducateur)
  if (allChildren.length > 0 && allEducators.length > 0) {
    // Mélanger les enfants pour une répartition aléatoire
    const shuffledChildren = [...allChildren].sort(() => Math.random() - 0.5);
    const childrenPerEducator: number[] = [];
    
    // Distribuer les enfants en s'assurant que chaque staff a entre 2 et 5 enfants
    let remainingChildren = shuffledChildren.length;
    let remainingEducators = allEducators.length;
    
    for (let i = 0; i < allEducators.length; i++) {
      const min = 2;
      const max = Math.min(5, remainingChildren - (remainingEducators - 1) * 2);
      const count = Math.max(min, Math.min(max, Math.floor(remainingChildren / remainingEducators)));
      
      childrenPerEducator.push(count);
      remainingChildren -= count;
      remainingEducators--;
    }
    
    // Assigner les enfants aux éducateurs
    let childIndex = 0;
    for (let educatorIndex = 0; educatorIndex < allEducators.length; educatorIndex++) {
      const educatorId = allEducators[educatorIndex];
      const count = childrenPerEducator[educatorIndex];
      
      for (let i = 0; i < count && childIndex < shuffledChildren.length; i++) {
        const child = shuffledChildren[childIndex];
        await prisma.child.update({
          where: { id: child.id },
          data: { 
            referents: {
              connect: { id: educatorId }
            }
          },
        });
        childIndex++;
      }
    }
    
    console.log('✅ Référents assignés (2-5 enfants par éducateur)');
    console.log('📊 Répartition:', childrenPerEducator.map((count, index) => `Éducateur ${index + 1}: ${count} enfants`).join(', '));
  }

  // Génération des feuilles de présence jusqu'à aujourd'hui (optimisée)
  const start = new Date('2024-01-01'); // Commencer en 2024 au lieu de 2023
  const end = yesterday;
  
  if (start <= end) {
    console.log('📅 Génération des feuilles de présence (optimisée)...');
    const current = new Date(start);
    let sheetsCreated = 0;
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && allChildren.length > 0) { // Exclure weekends
        await prisma.presenceSheet.create({
          data: {
            date: new Date(current),
            records: {
              create: allChildren.map((child, index) => ({
                childId: child.id,
                present: (current.getDate() + index) % 5 !== 0, // 80% de présence
              })),
            },
          },
        });
        sheetsCreated++;
      }
      current.setDate(current.getDate() + 1);
    }
    console.log(`✅ ${sheetsCreated} feuilles de présence générées`);
  }

  // Génération des missions pour 2024-2025 seulement
  const missions = [
    { description: 'Développer l\'autonomie - Favoriser l\'acquisition d\'autonomie dans les gestes du quotidien' },
    { description: 'Socialisation - Développer les compétences sociales et relationnelles' },
    { description: 'Communication - Améliorer les capacités de communication verbale et non verbale' },
    { description: 'Apprentissages scolaires - Soutenir les apprentissages fondamentaux' },
    { description: 'Motricité - Développer les compétences motrices fines et globales' },
  ];

  // Missions seulement pour 2024-2025
  const currentAcademicYear = await prisma.academicYear.findUnique({
    where: { label: '2024-2025' },
  });
  
  if (currentAcademicYear) {
    console.log('📋 Génération des missions pour 2024-2025...');
    let missionsCreated = 0;
    
    for (const child of allChildren) {
      for (const mission of missions) {
        const existing = await prisma.mission.findFirst({
          where: { 
            childId: child.id,
            description: mission.description,
            academicYearId: currentAcademicYear.id,
          },
        });
        
        if (!existing) {
          await prisma.mission.create({
            data: {
              description: mission.description,
              childId: child.id,
              academicYearId: currentAcademicYear.id,
            },
          });
          missionsCreated++;
        }
      }
    }
    console.log(`✅ ${missionsCreated} missions créées pour 2024-2025`);
  }

  // Génération des journaux mensuels seulement pour 2024-2025
  const journalPeriods: { month: number; year: number; academicYear: string }[] = [];
  
  // Seulement 2024-2025
  for (let month = 9; month <= 12; month++) {
    journalPeriods.push({ month, year: 2024, academicYear: '2024-2025' });
  }
  for (let month = 1; month <= 6; month++) {
    journalPeriods.push({ month, year: 2025, academicYear: '2024-2025' });
  }

  let journalsCreated = 0;
  console.log('📝 Génération des journaux mensuels (optimisée)...');

  for (const period of journalPeriods) {
    const { month, year, academicYear } = period;
    const academicYearRecord = await prisma.academicYear.findUnique({
      where: { label: academicYear },
    });
    
    if (!academicYearRecord) {
      continue;
    }

    // Créer les journaux par batch pour améliorer les performances
    const journalsToCreate: any[] = [];
    
    for (let childIndex = 0; childIndex < allChildren.length; childIndex++) {
      const child = allChildren[childIndex];
      const educatorIndex = Math.floor(childIndex / Math.ceil(allChildren.length / allEducators.length)) % allEducators.length;
      const educatorId = allEducators[educatorIndex];
      
      const existingJournal = await prisma.journalMensuel.findFirst({
        where: {
          childId: child.id,
          month,
          academicYearId: academicYearRecord.id,
        },
      });
      
      if (!existingJournal) {
        const observations = [
          `Bon mois pour ${child.firstName}, progrès notables en autonomie et socialisation.`,
          `${child.firstName} a montré des difficultés en début de mois, mais s'améliore progressivement.`,
          `Excellente participation aux activités pour ${child.firstName}, très motivé(e).`,
          `${child.firstName} développe de bonnes relations avec ses pairs et le personnel.`,
          `Progrès significatifs en communication pour ${child.firstName} ce mois-ci.`,
        ];

        journalsToCreate.push({
          childId: child.id,
          month,
          academicYearId: academicYearRecord.id,
          contenu: observations[childIndex % observations.length],
          educatorId: educatorId,
          isDraft: false,
          isSubmitted: true,
          submittedAt: new Date(),
        });
      }
    }

    // Créer les journaux par batch
    if (journalsToCreate.length > 0) {
      await prisma.journalMensuel.createMany({
        data: journalsToCreate,
      });
      journalsCreated += journalsToCreate.length;
    }
    
    console.log(`✅ Mois ${month}/${year}: ${journalsToCreate.length} journaux`);
  }

  /* ---------------------------------------------------------------------- */
  /* 7. COURS INTERACTIFS                                                   */
  /* ---------------------------------------------------------------------- */
  console.log('📚 Génération des cours interactifs...');
  
  // Cours d'Algèbre
  const algebraCourse = await prisma.course.create({
    data: {
      title: 'Cours d\'Algèbre',
      description: 'Comprendre la notion de variable et d\'expression algébrique. Maîtriser la méthode de résolution d\'une équation du premier degré.',
      type: 'ALGEBRA' as const,
      status: 'PUBLISHED' as const,
      duration: 10,
      difficulty: 3,
      objectives: [
        'Comprendre la notion de variable et d\'expression algébrique',
        'Maîtriser la méthode de résolution d\'une équation du premier degré',
        'Développer l\'esprit logique pas à pas'
      ],
      keywords: ['algèbre', 'équation', 'variable', 'mathématiques'],
      hasAudio: true,
      hasVideo: false,
      hasImages: true,
      isAccessible: true,
      publishedAt: new Date(),
    },
  });

  // Sections du cours d'Algèbre
  const algebraSections = [
    {
      title: 'Introduction et motivation',
      description: 'Si tu gagnes 2 pièces par jeu et que tu veux avoir 14 pièces, combien de jeux dois-tu gagner ?',
      type: 'INTRODUCTION' as const,
      order: 1,
      duration: 1,
      content: {
        type: 'introduction',
        accroche: 'Si tu gagnes 2 pièces par jeu et que tu veux avoir 14 pièces, combien de jeux dois‑tu gagner ?',
        concept: 'Présenter l\'idée de variable : ici, le nombre de jeux est inconnu, on appelle cette inconnue x.'
      }
    },
    {
      title: 'Notions clés et exemples illustrés',
      description: 'Variable, expression algébrique et équation expliquées avec des exemples concrets',
      type: 'LESSON' as const,
      order: 2,
      duration: 3,
      content: {
        type: 'lesson',
        concepts: [
          {
            name: 'Variable (x)',
            description: 'boîte qui contient un nombre inconnu',
            example: 'Visualiser une boîte vide et y ajouter un nombre à la fin'
          },
          {
            name: 'Expression algébrique',
            description: 'suite d\'opérations avec des nombres et x',
            example: '3x + 5, montre trois boîtes + ajout de 5 bonbons'
          },
          {
            name: 'Équation',
            description: 'met en relation deux expressions avec =',
            example: '3x + 5 = 17, équation montre que la boîte + 5 = 17'
          }
        ]
      }
    },
    {
      title: 'Méthode de résolution pas à pas',
      description: 'Résoudre l\'équation 3x + 5 = 17 étape par étape',
      type: 'LESSON' as const,
      order: 3,
      duration: 3,
      content: {
        type: 'stepByStep',
        equation: '3x + 5 = 17',
        steps: [
          {
            step: 1,
            action: 'Soustraire 5',
            from: '3x + 5 = 17',
            to: '3x = 17 - 5 = 12'
          },
          {
            step: 2,
            action: 'Diviser par 3',
            from: '3x = 12',
            to: 'x = 12 ÷ 3 = 4'
          },
          {
            step: 3,
            action: 'Vérification',
            check: 'Remplacer x par 4 dans l\'équation initiale : 3×4 + 5 = 12 + 5 = 17 ✔'
          }
        ]
      }
    },
    {
      title: 'Exercices guidés',
      description: 'Exercices pratiques avec résolution et choix interactif',
      type: 'EXERCISE' as const,
      order: 4,
      duration: 2,
      content: {
        type: 'exercises',
        exercises: [
          {
            type: 'text_input',
            question: 'Résous l\'équation : 2x - 7 = 9',
            expected: 'x = 8'
          },
          {
            type: 'multiple_choice',
            question: 'Quelle équation a pour solution x = 3 ?',
            options: [
              '4x + 2 = 18',
              '5x - 5 = 10',
              '2x + 7 = 11',
              '3x + 1 = 13'
            ],
            correct: 1
          }
        ]
      }
    },
    {
      title: 'Problème en contexte',
      description: 'Application pratique avec un problème de la vie réelle',
      type: 'PRACTICE' as const,
      order: 5,
      duration: 1,
      content: {
        type: 'contextProblem',
        problem: 'Un vendeur a vendu x BD à 7€ chacune et a gagné 84€. Écris et résous l\'équation pour trouver x.',
        solution: '7x = 84 → x = 12'
      }
    }
  ];

  for (const sectionData of algebraSections) {
    await prisma.courseSection.create({
      data: {
        ...sectionData,
        courseId: algebraCourse.id,
      },
    });
  }

  // Cours de Français - Accord du participe passé
  const frenchCourse1 = await prisma.course.create({
    data: {
      title: 'Français : Accord du participe passé avec "avoir"',
      description: 'Comprendre la condition d\'accord du participe passé employé avec l\'auxiliaire avoir. Savoir identifier le COD et sa position.',
      type: 'FRENCH',
      status: 'PUBLISHED',
      duration: 8,
      difficulty: 2,
      objectives: [
        'Comprendre la condition d\'accord du participe passé employé avec l\'auxiliaire avoir',
        'Savoir identifier le COD et sa position'
      ],
      keywords: ['français', 'grammaire', 'participe passé', 'COD'],
      hasAudio: true,
      hasVideo: false,
      hasImages: true,
      isAccessible: true,
      publishedAt: new Date(),
    },
  });

  // Cours de Poésie
  const poetryCourse = await prisma.course.create({
    data: {
      title: 'Poésie : Rimes riches et schéma de versification',
      description: 'Identifier différents types de rimes et comprendre le schéma d\'un quatrain simple.',
      type: 'POETRY',
      status: 'PUBLISHED',
      duration: 7,
      difficulty: 2,
      objectives: [
        'Identifier différents types de rimes (pauvres, suffisantes, riches)',
        'Comprendre le schéma d\'un quatrain simple',
        'Écrire deux lignes avec rime riche'
      ],
      keywords: ['poésie', 'rimes', 'quatrain', 'versification'],
      hasAudio: true,
      hasVideo: false,
      hasImages: true,
      isAccessible: true,
      publishedAt: new Date(),
    },
  });

  // Cours de Français - Accord sujet-verbe
  const frenchCourse2 = await prisma.course.create({
    data: {
      title: 'Français : Accord sujet-verbe étendu',
      description: 'Maîtriser l\'accord du verbe avec le sujet en cas de sujets multiples et de temps différents.',
      type: 'FRENCH',
      status: 'PUBLISHED',
      duration: 8,
      difficulty: 2,
      objectives: [
        'Maîtriser l\'accord du verbe avec le sujet en cas de sujets multiples',
        'Reconnaître les pièges (sujets inversés, sujets composés)'
      ],
      keywords: ['français', 'grammaire', 'accord', 'sujet', 'verbe'],
      hasAudio: true,
      hasVideo: false,
      hasImages: true,
      isAccessible: true,
      publishedAt: new Date(),
    },
  });

  // Cours de Communication Alternative
  const communicationCourse = await prisma.course.create({
    data: {
      title: 'Communication Alternative : Pictogrammes avancés',
      description: 'Enrichir le vocabulaire pictographique et construire des phrases complexes avec des connecteurs.',
      type: 'COMMUNICATION',
      status: 'PUBLISHED',
      duration: 8,
      difficulty: 1,
      objectives: [
        'Enrichir le vocabulaire pictographique',
        'Construire des phrases complexes avec des connecteurs ("et", "parce que")'
      ],
      keywords: ['communication', 'pictogrammes', 'handicap', 'accessibilité'],
      hasAudio: true,
      hasVideo: true,
      hasImages: true,
      isAccessible: true,
      publishedAt: new Date(),
    },
  });

  console.log('✅ 5 cours interactifs créés');

  console.log('🌱 Seed terminé avec succès !');
  console.log(`📊 Résumé: 15 éducateurs, 25 parents, 30 enfants, ${journalsCreated} journaux, 5 cours interactifs`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

