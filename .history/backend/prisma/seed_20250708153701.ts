import { PrismaClient, Role, Discipline } from '@prisma/client';
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
  while (true) {
    const mail = initialEmail(first, last, idx);
    const exists = await prisma.user.findUnique({ where: { email: mail } });
    if (!exists) return mail;
    idx += 1;
  }
}

/* Seed -------------------------------------------------------------------- */
async function main() {
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  /* ---------------------------------------------------------------------- */
  /* 1. ADMIN (si nécessaire)                                               */
  /* ---------------------------------------------------------------------- */
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });
  
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: await bcrypt.hash('MonMotDePasse123!', 10),
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    console.log('✅ Admin créé → admin@example.com / MonMotDePasse123!');
  } else {
    console.log('ℹ️  Admin déjà présent, pas recréé');
  }

  /* ---------------------------------------------------------------------- */
  /* 2. DIRECTOR                                                            */
  /* ---------------------------------------------------------------------- */
  const directorMail = 'apajh94.direction@gmail.com';
  if (!(await prisma.user.findUnique({ where: { email: directorMail } }))) {
    const usr = await prisma.user.create({
      data: {
        email: directorMail,
        password: await hash(DEFAULT_PWD),
        role: 'DIRECTOR',
        emailVerified: true,
      },
    });
    
    await prisma.directorProfile.create({
      data: {
        userId: usr.id,
        firstName: 'Jean',
        lastName: 'Direction',
        phone: '06' + faker.string.numeric(8),
        birthDate: faker.date.birthdate({ min: 35, max: 55, mode: 'age' }),
        jobTitle: 'Directeur',
        startDate: faker.date.past({ years: 5 }),
        profileImage: null,
      },
    });
    console.log('✅ Director créé →', usr.email);
  }

  /* ---------------------------------------------------------------------- */
  /* 3. SERVICE_MANAGER x2                                                  */
  /* ---------------------------------------------------------------------- */
  const smMails = ['apajh94.cs@gmail.com', 'apajh94.cs2@gmail.com'];
  for (const mail of smMails) {
    if (!(await prisma.user.findUnique({ where: { email: mail } }))) {
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
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: '06' + faker.string.numeric(8),
          jobTitle: 'Chef·fe de service',
          startDate: faker.date.past({ years: 3 }),
          birthDate: faker.date.birthdate({ min: 30, max: 55, mode: 'age' }),
          profileImage: null,
        },
      });
      console.log('✅ Service-manager créé →', usr.email);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 4. SECRETARY x1                                                        */
  /* ---------------------------------------------------------------------- */
  const secMail = 'apajh94.secretary@gmail.com';
  if (!(await prisma.user.findUnique({ where: { email: secMail } }))) {
    const usr = await prisma.user.create({
      data: {
        email: secMail,
        password: await hash(DEFAULT_PWD),
        role: 'SECRETARY',
        emailVerified: true,
      },
    });
    
    await prisma.secretaryProfile.create({
      data: {
        userId: usr.id,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '06' + faker.string.numeric(8),
        birthDate: faker.date.birthdate({ min: 25, max: 45, mode: 'age' }),
        specialty: 'Secrétariat général',
        startDate: faker.date.past({ years: 2 }),
        profileImage: null,
      },
    });
    console.log('✅ Secretary créé →', usr.email);
  }

  /* ---------------------------------------------------------------------- */
  /* 5. STAFF (13 au total)                                                 */
  /* ---------------------------------------------------------------------- */
  type StaffSpec = { qty: number; discipline: Discipline };
  const staffSpecs: StaffSpec[] = [
    { qty: 5, discipline: 'EDUCATOR' },
    { qty: 5, discipline: 'TECH_EDUCATOR' },
    { qty: 1, discipline: 'PSYCHOLOGIST' },
    { qty: 1, discipline: 'PSYCHIATRIST' },
    { qty: 1, discipline: 'ORTHOPEDIST' },
  ];

  for (const { qty, discipline } of staffSpecs) {
    for (let i = 0; i < qty; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = await uniqueStaffEmail(first, last);

      const usr = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: await hash(DEFAULT_PWD),
          role: 'STAFF',
          emailVerified: true,
        },
      });
      
      await prisma.staffProfile.upsert({
        where: { userId: usr.id },
        update: {},
        create: {
          userId: usr.id,
          firstName: first,
          lastName: last,
          phone: '06' + faker.string.numeric(8),
          birthDate: faker.date.birthdate({ min: 25, max: 55, mode: 'age' }),
          discipline,
          specialty: discipline === 'EDUCATOR' ? 'Général' : null,
        },
      });
    }
    console.log(`✅ ${qty} staff ${discipline} créés`);
  }

  /* ---------------------------------------------------------------------- */
  /* 6. PARENTS + CHILDREN (40 parents, 45 enfants)                        */
  /* ---------------------------------------------------------------------- */
  const totalParents = 35 + 5; // 35 avec 1 enfant + 5 avec 2 enfants
  for (let p = 0; p < totalParents; p++) {
    const firstP = faker.person.firstName();
    const lastP = faker.person.lastName();
    const email = `parent${p + 1}@example.com`;

    const childCount = p < 35 ? 1 : 2;
    const childrenData = Array.from({ length: childCount }).map(() => ({
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      birthDate: faker.date.birthdate({ min: 9, max: 14, mode: 'age' }),
    }));

    const usr = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: await hash(DEFAULT_PWD),
        role: 'PARENT',
        emailVerified: true,
      },
    });
    
    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: usr.id },
      update: {},
      create: {
        userId: usr.id,
        firstName: firstP,
        lastName: lastP,
        phone: '06' + faker.string.numeric(8),
        address: faker.location.streetAddress(),
        legalResponsibility: 'Père/Mère',
      },
    });

    // Créer les enfants
    for (const childData of childrenData) {
      await prisma.child.create({
        data: {
          ...childData,
          parentProfileId: parentProfile.id,
        },
      });
    }

    // Créer le contact d'urgence
    await prisma.emergencyContact.create({
      data: {
        parentProfileId: parentProfile.id,
        name: faker.person.fullName(),
        phone: '06' + faker.string.numeric(8),
        relation: 'Tante',
      },
    });
  }
  console.log('✅ 40 Parents + 45 enfants + contacts d\'urgence créés');

  // Année scolaire et semestres
  const academicYears = [
    { label: '2023-2024', startDate: new Date('2023-09-01'), endDate: new Date('2024-07-31') },
    { label: '2024-2025', startDate: new Date('2024-09-01'), endDate: new Date('2025-07-31') },
  ];

  for (const year of academicYears) {
    const existing = await prisma.academicYear.findUnique({ where: { label: year.label } });
    if (!existing) {
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
  }

  // Assignation des référents
  const allChildren = await prisma.child.findMany();
  const allStaff = await prisma.staffProfile.findMany();
  
  if (allChildren.length > 0 && allStaff.length > 0) {
    for (const child of allChildren) {
      const randomStaff = allStaff[Math.floor(Math.random() * allStaff.length)];
      await prisma.child.update({
        where: { id: child.id },
        data: { 
          referents: {
            connect: { id: randomStaff.userId }
          }
        },
      });
    }
  }

  // Génération des feuilles de présence
  const start = new Date('2024-01-01');
  const end = yesterday;
  
  if (start <= end) {
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0) {
        const existing = await prisma.presenceSheet.findUnique({
          where: { date: new Date(current) },
        });
        
        if (!existing && allChildren.length > 0) {
          await prisma.presenceSheet.create({
            data: {
              date: new Date(current),
              records: {
                create: allChildren.map(child => ({
                  childId: child.id,
                  present: Math.random() > 0.2,
                })),
              },
            },
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }
  }

  // Génération des missions
  const missions = [
    { description: 'Développer l\'autonomie - Favoriser l\'acquisition d\'autonomie dans les gestes du quotidien' },
    { description: 'Socialisation - Développer les compétences sociales et relationnelles' },
    { description: 'Communication - Améliorer les capacités de communication verbale et non verbale' },
  ];

  for (const child of allChildren) {
    for (const mission of missions) {
      const existing = await prisma.mission.findFirst({
        where: { 
          childId: child.id,
          description: mission.description,
        },
      });
      
      if (!existing) {
        const currentAcademicYear = await prisma.academicYear.findFirst({
          where: { label: '2024-2025' },
        });
        
        if (currentAcademicYear) {
          await prisma.mission.create({
            data: {
              description: mission.description,
              childId: child.id,
              academicYearId: currentAcademicYear.id,
            },
          });
        }
      }
    }
  }

  // Génération des journaux mensuels
  const currentAcademicYear = '2024-2025';
  const previousAcademicYear = '2023-2024';
  
  const months = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
  const periods: { month: number; year: number; academicYear: string }[] = [];
  
  for (const month of months) {
    const year = month >= 9 ? 2023 : 2024;
    const academicYear = month >= 9 ? previousAcademicYear : currentAcademicYear;
    periods.push({ month, year, academicYear });
  }
  
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentAcademicYearRecord = await prisma.academicYear.findUnique({
    where: { label: currentAcademicYear },
  });
  
  if (currentAcademicYearRecord) {
    for (const month of months) {
      const year = month >= 9 ? 2024 : 2025;
      const academicYear = month >= 9 ? currentAcademicYear : currentAcademicYear;
      
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        periods.push({ month, year, academicYear });
      }
    }
  }

  let journalsCreated = 0;
  const assignedStaff = allStaff.length > 0 ? allStaff[0] : null;
  
  if (!assignedStaff) {
    return;
  }

  for (const period of periods) {
    const { month, year, academicYear } = period;
    const academicYearRecord = await prisma.academicYear.findUnique({
      where: { label: academicYear },
    });
    
    if (!academicYearRecord) {
      continue;
    }

    for (const child of allChildren) {
      const existingJournal = await prisma.journalMensuel.findFirst({
        where: {
          childId: child.id,
          month,
          academicYearId: academicYearRecord.id,
        },
      });
      
      if (!existingJournal) {
        const observations = [
          `Bon mois pour ${child.firstName}, progrès notables en autonomie.`,
          `${child.firstName} a montré des difficultés en début de mois, mais s'améliore.`,
          `Excellente participation aux activités pour ${child.firstName}.`,
          `${child.firstName} développe de bonnes relations avec ses pairs.`,
        ];

        await prisma.journalMensuel.create({
          data: {
            childId: child.id,
            month,
            academicYearId: academicYearRecord.id,
            contenu: observations[Math.floor(Math.random() * observations.length)],
            educatorId: assignedStaff.userId,
          },
        });
        
        journalsCreated++;
      }
    }
  }

  console.log('🌱 Seed terminé avec succès !');
  console.log(`📊 Résumé: 13 staff, 40 parents, 45 enfants, ${journalsCreated} journaux`);
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
