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
  }

  const directors = [
    { firstName: 'Marie', lastName: 'Dubois', email: 'marie.dubois@example.com', jobTitle: 'Directrice générale' },
    { firstName: 'Jean', lastName: 'Martin', email: 'jean.martin@example.com', jobTitle: 'Directeur adjoint' },
  ];

  for (const dir of directors) {
    const existing = await prisma.user.findUnique({ where: { email: dir.email } });
    if (!existing) {
      const usr = await prisma.user.create({
        data: {
          email: dir.email,
          password: await bcrypt.hash('TempPassword123!', 10),
          role: 'DIRECTOR',
          emailVerified: true,
        },
      });
      
      await prisma.directorProfile.create({
        data: {
          userId: usr.id,
          jobTitle: dir.jobTitle,
          startDate: new Date('2020-01-01'),
          profileImage: null,
          firstName: dir.firstName,
          lastName: dir.lastName,
          birthDate: new Date('1980-01-01'),
          phone: '0123456789',
        },
      });
    }
  }

  const serviceManagers = [
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice.johnson@example.com', jobTitle: 'Chef de service éducatif' },
    { firstName: 'Bob', lastName: 'Brown', email: 'bob.brown@example.com', jobTitle: 'Chef de service médical' },
  ];

  for (const sm of serviceManagers) {
    const existing = await prisma.user.findUnique({ where: { email: sm.email } });
    if (!existing) {
      const usr = await prisma.user.create({
        data: {
          email: sm.email,
          password: await bcrypt.hash('TempPassword123!', 10),
          role: 'SERVICE_MANAGER',
          emailVerified: true,
        },
      });
      
      await prisma.serviceManagerProfile.create({
        data: {
          userId: usr.id,
          jobTitle: sm.jobTitle,
          startDate: new Date('2020-01-01'),
          profileImage: null,
          firstName: sm.firstName,
          lastName: sm.lastName,
          birthDate: new Date('1980-01-01'),
          phone: '0123456789',
        },
      });
    }
  }

  const secretaries = [
    { firstName: 'Claire', lastName: 'Wilson', email: 'claire.wilson@example.com', specialty: 'Secrétariat médical' },
    { firstName: 'David', lastName: 'Davis', email: 'david.davis@example.com', specialty: 'Secrétariat administratif' },
  ];

  for (const sec of secretaries) {
    const existing = await prisma.user.findUnique({ where: { email: sec.email } });
    if (!existing) {
      const usr = await prisma.user.create({
        data: {
          email: sec.email,
          password: await bcrypt.hash('TempPassword123!', 10),
          role: 'SECRETARY',
          emailVerified: true,
        },
      });
      
      await prisma.secretaryProfile.create({
        data: {
          userId: usr.id,
          startDate: new Date('2020-01-01'),
          profileImage: null,
          firstName: sec.firstName,
          lastName: sec.lastName,
          birthDate: new Date('1980-01-01'),
          phone: '0123456789',
          specialty: sec.specialty,
        },
      });
    }
  }

  const staffTypes = [
    { discipline: 'EDUCATEUR_SPECIALISE', qty: 5 },
    { discipline: 'PSYCHOLOGUE', qty: 2 },
    { discipline: 'ORTHOPHONISTE', qty: 2 },
    { discipline: 'PSYCHOMOTRICIEN', qty: 1 },
    { discipline: 'ASSISTANT_SOCIAL', qty: 1 },
  ];

  let staffIndex = 1;
  for (const { discipline, qty } of staffTypes) {
    for (let i = 0; i < qty; i++) {
      const email = `staff${staffIndex}@example.com`;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        const usr = await prisma.user.create({
          data: {
            email,
            password: await bcrypt.hash('TempPassword123!', 10),
            role: 'STAFF',
            emailVerified: true,
          },
        });
        
        await prisma.staffProfile.create({
          data: {
            userId: usr.id,
            firstName: `Staff${staffIndex}`,
            lastName: `User${staffIndex}`,
            birthDate: new Date('1985-01-01'),
            phone: '0123456789',
            discipline: discipline as any,
            specialty: null,
          },
        });
      }
      staffIndex++;
    }
  }

  const parentsAndChildren = [
    { parent: { firstName: 'Sophie', lastName: 'Garcia', email: 'sophie.garcia@example.com' }, children: [
      { firstName: 'Emma', lastName: 'Garcia', birthDate: new Date('2015-03-15') },
      { firstName: 'Louis', lastName: 'Garcia', birthDate: new Date('2017-08-22') },
    ]},
    { parent: { firstName: 'Thomas', lastName: 'Miller', email: 'thomas.miller@example.com' }, children: [
      { firstName: 'Chloé', lastName: 'Miller', birthDate: new Date('2016-05-10') },
    ]},
  ];

  for (const { parent, children } of parentsAndChildren) {
    const existing = await prisma.user.findUnique({ where: { email: parent.email } });
    if (!existing) {
      const usr = await prisma.user.create({
        data: {
          email: parent.email,
          password: await bcrypt.hash('TempPassword123!', 10),
          role: 'PARENT',
          emailVerified: true,
        },
      });
      
      const parentProfile = await prisma.parentProfile.create({
        data: {
          userId: usr.id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          phone: '0123456789',
          address: '123 Rue Example',
          legalResponsibility: 'Responsable légal',
        },
      });

      for (const child of children) {
        await prisma.child.create({
          data: {
            firstName: child.firstName,
            lastName: child.lastName,
            birthDate: child.birthDate,
            parentId: parentProfile.id,
          },
        });
      }
    }
  }

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
          academicYearId: yr.id,
        },
      });

      await prisma.semester.create({
        data: {
          name: sem2Name,
          startDate: new Date(yr.startDate.getFullYear() + 1, 1, 1),
          endDate: yr.endDate,
          academicYearId: yr.id,
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
        data: { referentId: randomStaff.id },
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
                  justificationPath: Math.random() > 0.8 ? 'sample-justification.pdf' : null,
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
    { title: 'Développer l\'autonomie', description: 'Favoriser l\'acquisition d\'autonomie dans les gestes du quotidien' },
    { title: 'Socialisation', description: 'Développer les compétences sociales et relationnelles' },
    { title: 'Communication', description: 'Améliorer les capacités de communication verbale et non verbale' },
  ];

  for (const child of allChildren) {
    for (const mission of missions) {
      const existing = await prisma.mission.findFirst({
        where: { 
          childId: child.id,
          title: mission.title,
        },
      });
      
      if (!existing) {
        const assignedStaff = allStaff[Math.floor(Math.random() * allStaff.length)];
        await prisma.mission.create({
          data: {
            title: mission.title,
            description: mission.description,
            childId: child.id,
            assignedStaffId: assignedStaff.id,
            status: 'IN_PROGRESS',
          },
        });
      }
    }
  }

  // Génération des journaux mensuels
  const currentAcademicYear = '2024-2025';
  const previousAcademicYear = '2023-2024';
  
  const months = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
  const periods = [];
  
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
      const existingJournal = await prisma.monthlyJournal.findFirst({
        where: {
          childId: child.id,
          month,
          year,
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

        await prisma.monthlyJournal.create({
          data: {
            childId: child.id,
            month,
            year,
            academicYearId: academicYearRecord.id,
            observations: observations[Math.floor(Math.random() * observations.length)],
            educatorId: assignedStaff.id,
          },
        });
        
        journalsCreated++;
      }
    }
  }
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
