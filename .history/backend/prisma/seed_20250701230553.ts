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
  console.log('🌱 Démarrage du seed avec génération dynamique des données...');
  console.log(`📅 Les présences seront générées de 2024 jusqu'à la veille d'aujourd'hui (${new Date(Date.now() - 24*60*60*1000).toLocaleDateString('fr-FR')})`);
  console.log('');

  /* ---------------------------------------------------------------------- */
  /* 1. ADMIN (si nécessaire)                                               */
  /* ---------------------------------------------------------------------- */
  const adminExists = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: await hash('MonMotDePasse123!'),
        role: Role.ADMIN,
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
        role: Role.DIRECTOR,
        emailVerified: true,
        directorProfile: {
          create: {
            firstName: 'Jean',
            lastName: 'Direction',
            phone: '06' + faker.string.numeric(8),
            birthDate: faker.date.birthdate({ min: 35, max: 55, mode: 'age' }),
            jobTitle: 'Directeur',
            startDate: faker.date.past({ years: 5 }),
          },
        },
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
          role: Role.SERVICE_MANAGER,
          emailVerified: true,
          serviceManagerProfile: {
            create: {
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              phone: '06' + faker.string.numeric(8),
              jobTitle: 'Chef·fe de service',
              startDate: faker.date.past({ years: 3 }),
              birthDate: faker.date.birthdate({ min: 30, max: 55, mode: 'age' }),
            },
          },
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
        role: Role.SECRETARY,
        emailVerified: true,
        secretaryProfile: {
          create: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: '06' + faker.string.numeric(8),
            birthDate: faker.date.birthdate({ min: 25, max: 45, mode: 'age' }),
            specialty: 'Secrétariat général',
            startDate: faker.date.past({ years: 2 }),
          },
        },
      },
    });
    console.log('✅ Secretary créé →', usr.email);
  }

  /* ---------------------------------------------------------------------- */
  /* 5. STAFF                                                               */
  /* ---------------------------------------------------------------------- */
  type StaffSpec = { qty: number; discipline: Discipline };
  const staffSpecs: StaffSpec[] = [
    { qty: 5, discipline: Discipline.EDUCATOR },
    { qty: 5, discipline: Discipline.TECH_EDUCATOR },
    { qty: 1, discipline: Discipline.PSYCHOLOGIST },
    { qty: 1, discipline: Discipline.PSYCHIATRIST },
    { qty: 1, discipline: Discipline.ORTHOPEDIST },
  ];

  for (const { qty, discipline } of staffSpecs) {
    for (let i = 0; i < qty; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = await uniqueStaffEmail(first, last);

      await prisma.user.create({
        data: {
          email,
          password: await hash(DEFAULT_PWD),
          role: Role.STAFF,
          emailVerified: true,
          staffProfile: {
            create: {
              firstName: first,
              lastName: last,
              phone: '06' + faker.string.numeric(8),
              birthDate: faker.date.birthdate({ min: 25, max: 55, mode: 'age' }),
              discipline,
              specialty: discipline === Discipline.EDUCATOR ? 'Général' : undefined,
            },
          },
        },
      });
    }
    console.log(`✅ ${qty} staff ${discipline} créés`);
  }

  /* ---------------------------------------------------------------------- */
  /* 6. PARENTS + CHILDREN                                                  */
  /* ---------------------------------------------------------------------- */
  const totalParents = 40; // 35 with 1 child, 5 with 2
  for (let p = 0; p < totalParents; p++) {
    const firstP = faker.person.firstName();
    const lastP = faker.person.lastName();
    const email = `parent${p + 1}@example.com`;

    const childCount = p < 35 ? 1 : 2;
    const childrenData = Array.from({ length: childCount }).map(() => ({
      firstName: faker.person.firstName(),
      lastName: lastP,
      birthDate: faker.date.birthdate({ min: 9, max: 14, mode: 'age' }),
    }));

    await prisma.user.create({
      data: {
        email,
        password: await hash(DEFAULT_PWD),
        role: Role.PARENT,
        emailVerified: true,
        parentProfile: {
          create: {
            firstName: firstP,
            lastName: lastP,
            phone: '06' + faker.string.numeric(8),
            address: faker.location.streetAddress(),
            legalResponsibility: 'Père/Mère',
            notificationPrefs: {},
            emergencyContacts: {
              create: [{
                name: faker.person.fullName(),
                phone: '06' + faker.string.numeric(8),
                relation: 'Tante',
              }],
            },
            children: { create: childrenData },
          },
        },
      },
    });
  }
  console.log('✅ Parents + enfants créés');

  /* ---------------------------------------------------------------------- */
  /* 7. ANNÉES SCOLAIRES                                                    */
  /* ---------------------------------------------------------------------- */
  const existingYears = await prisma.academicYear.findMany({
    where: { label: { in: ['2023-2024', '2024-2025', '2025-2026', '2026-2027', '2027-2028'] } },
    select: { label: true },
  });
  const existingLabels = existingYears.map(y => y.label);
  const yearsToCreate = [
    { label: '2023-2024', startDate: new Date('2023-09-01'), endDate: new Date('2024-08-31') },
    { label: '2024-2025', startDate: new Date('2024-09-01'), endDate: new Date('2025-08-31') },
    { label: '2025-2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-08-31') },
    { label: '2026-2027', startDate: new Date('2026-09-01'), endDate: new Date('2027-08-31') },
    { label: '2027-2028', startDate: new Date('2027-09-01'), endDate: new Date('2028-08-31') },
  ].filter(y => !existingLabels.includes(y.label));

  for (const yr of yearsToCreate) {
    await prisma.academicYear.create({ data: yr });
    console.log(`✅ Année scolaire insérée : ${yr.label}`);
  }

  /* ---------------------------------------------------------------------- */
  /* 7-bis. SEMESTRES                                                       */
  /* ---------------------------------------------------------------------- */
  const allYears = await prisma.academicYear.findMany();

  for (const ay of allYears) {
    const [startYear, endYear] = ay.label.split('-').map(Number);
    const sem1Name = `${ay.label} S1`;
    const sem2Name = `${ay.label} S2`;

    const sem1Exists = await prisma.semester.findFirst({ where: { name: sem1Name } });
    const sem2Exists = await prisma.semester.findFirst({ where: { name: sem2Name } });

    if (!sem1Exists) {
      await prisma.semester.create({
        data: {
          name: sem1Name,
          startDate: new Date(`${startYear}-09-01`),
          endDate: new Date(`${startYear + 1}-01-31`),
        },
      });
      console.log(`✅ Semestre créé : ${sem1Name}`);
    }

    if (!sem2Exists) {
      await prisma.semester.create({
        data: {
          name: sem2Name,
          startDate: new Date(`${startYear + 1}-02-01`),
          endDate: new Date(`${startYear + 1}-08-31`),
        },
      });
      console.log(`✅ Semestre créé : ${sem2Name}`);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 8. RÉFÉRENTS                                                            */
  /* ---------------------------------------------------------------------- */
  const allChildren = await prisma.child.findMany({ select: { id: true } });
  const allStaff = await prisma.user.findMany({ where: { role: Role.STAFF }, select: { id: true } });

  let staffIndex = 0;
  let countForCurrent = 0;
  const maxPerStaff = 5;

  for (const child of allChildren) {
    const referentId = allStaff[staffIndex]?.id;
    if (referentId) {
      await prisma.child.update({ where: { id: child.id }, data: { referents: { connect: { id: referentId } } } });
      countForCurrent++;
      if (countForCurrent >= maxPerStaff) {
        staffIndex = Math.min(staffIndex + 1, allStaff.length - 1);
        countForCurrent = 0;
      }
    }
  }
  console.log('✅ Référents assignés');

  /* ---------------------------------------------------------------------- */
  /* 9. PRÉSENCES & JUSTIFICATIONS (2024 → veille d'aujourd'hui)             */
  /* ---------------------------------------------------------------------- */
  const staffIds = allStaff.map(u => u.id);
  let staffCursor = 0;
  function nextStaffId() { const id = staffIds[staffCursor]; staffCursor = (staffCursor + 1) % staffIds.length; return id; }

  // Calcul dynamique : du 1er janvier 2024 jusqu'à la veille d'aujourd'hui
  const start = new Date('2024-01-01');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const end = yesterday;
  
  console.log(`ℹ️  DEBUG: Aujourd'hui = ${today.toLocaleDateString('fr-FR')}`);
  console.log(`ℹ️  DEBUG: Hier = ${yesterday.toLocaleDateString('fr-FR')}`);
  console.log(`ℹ️  Génération des présences de ${start.toLocaleDateString('fr-FR')} à ${end.toLocaleDateString('fr-FR')}`);
  
  // Vérification que la période est valide
  if (end < start) {
    console.log('⚠️  Aucune présence à générer : date de fin antérieure à la date de début');
    return;
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Génération pour TOUS les jours (y compris weekends)
    const sheet = await prisma.presenceSheet.upsert({ where: { date: d }, create: { date: d, staffId: nextStaffId(), status: 'PENDING_SECRETARY', validatedAtStaff: faker.date.between({ from: new Date(d.getTime() - 2*3600000), to: new Date(d.getTime() - 1800000) }) }, update: {} });
    for (const { id: childId } of allChildren) {
      const isPresent = faker.number.float({ min: 0, max: 1, fractionDigits: 2 }) < 0.7;
      const record = await prisma.presenceRecord.create({ data: { sheetId: sheet.id, childId, present: isPresent } });
      if (!isPresent && faker.datatype.boolean()) {
        const type = faker.helpers.arrayElement(['ABSENCE','LATENESS'] as const);
        await prisma.absenceJustification.create({ data: { recordId: record.id, type, justificationDate: d, motif: type==='ABSENCE' ? faker.helpers.arrayElement(['Certificat médical','RDV familial','Congé exceptionnel']) : '', filePath: faker.datatype.boolean() ? `uploads/justifications/${faker.string.uuid()}.pdf` : null } });
      }
    }
  }
  console.log(`✅ Présences & justifications générées (${start.toLocaleDateString('fr-FR')} → ${end.toLocaleDateString('fr-FR')})`);

  /* ---------------------------------------------------------------------- */
  /* 10. MISSIONS ET JOURNAUX MENSUELS                                     */
  /* ---------------------------------------------------------------------- */
  console.log('🌱 Génération des missions et journaux mensuels...');
  
  // Récupérer toutes les années scolaires
  const academicYears = await prisma.academicYear.findMany({ orderBy: { startDate: 'asc' } });
  
  // Missions types IME
  const missionTemplates = [
    "Développer l'autonomie dans les gestes de la vie quotidienne",
    "Améliorer les compétences en communication et expression",
    "Renforcer les apprentissages scolaires fondamentaux",
    "Développer les habiletés sociales et relationnelles",
    "Travailler sur la gestion des émotions et du comportement",
    "Améliorer la motricité fine et globale",
    "Développer la confiance en soi et l'estime de soi",
    "Acquérir des compétences préprofessionnelles",
    "Favoriser l'inclusion et la socialisation",
    "Développer la créativité et l'expression artistique"
  ];

  // Contenus types pour les journaux mensuels
  const journalTemplates = [
    "Ce mois-ci, l'enfant a montré des progrès significatifs dans ses apprentissages. Il participe activement aux ateliers éducatifs et démontre une meilleure concentration.",
    "L'enfant a travaillé sur l'autonomie au quotidien. On observe une amélioration dans la gestion de ses affaires personnelles et une plus grande indépendance.",
    "Bonne participation aux activités de groupe. L'enfant développe ses compétences sociales et s'investit davantage dans les projets collectifs.",
    "Ce mois a été marqué par un travail spécifique sur la communication. L'enfant s'exprime de mieux en mieux et interagit positivement avec ses pairs.",
    "L'enfant a bénéficié d'un accompagnement individualisé qui porte ses fruits. On note une évolution positive dans son comportement et sa motivation.",
    "Participation assidue aux ateliers créatifs et sportifs. L'enfant découvre de nouveaux centres d'intérêt et développe ses talents.",
    "Travail approfondi sur les apprentissages scolaires. L'enfant progresse à son rythme et gagne en confiance dans ses capacités.",
    "Ce mois a permis de consolider les acquis précédents. L'enfant maintient ses efforts et continue sa progression dans tous les domaines."
  ];

  // Générer les missions pour chaque enfant
  for (const year of academicYears) {
    for (const child of allChildren) {
      const existingMissions = await prisma.mission.findMany({
        where: { childId: child.id, academicYearId: year.id }
      });
      
      if (existingMissions.length === 0) {
        // Générer 3-5 missions par enfant par année
        const missionCount = faker.number.int({ min: 3, max: 5 });
        const selectedMissions = faker.helpers.arrayElements(missionTemplates, missionCount);
        
        for (const missionDesc of selectedMissions) {
          await prisma.mission.create({
            data: {
              description: missionDesc,
              childId: child.id,
              academicYearId: year.id
            }
          });
        }
      }
    }
  }
  console.log('✅ Missions créées pour tous les enfants');

  // Générer les journaux mensuels
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() retourne 0-11
  
  // Calculer les périodes à couvrir
  const periods: { year: number; month: number }[] = [];
  
  // Année précédente complète (janvier à décembre)
  const previousYear = currentYear - 1;
  for (let month = 1; month <= 12; month++) {
    periods.push({ year: previousYear, month });
  }
  
  // Année actuelle jusqu'au mois précédent
  const lastMonthToCover = currentMonth - 1;
  if (lastMonthToCover > 0) {
    for (let month = 1; month <= lastMonthToCover; month++) {
      periods.push({ year: currentYear, month });
    }
  }
  
  console.log(`ℹ️  Génération des journaux pour ${periods.length} mois :`);
  console.log(`   - ${previousYear} : janvier à décembre (12 mois)`);
  if (lastMonthToCover > 0) {
    console.log(`   - ${currentYear} : janvier à ${lastMonthToCover === 12 ? 'décembre' : new Date(currentYear, lastMonthToCover - 1).toLocaleDateString('fr-FR', { month: 'long' })} (${lastMonthToCover} mois)`);
  }

  // Obtenir tous les staff comme éducateurs potentiels
  const allEducators = await prisma.user.findMany({
    where: { role: Role.STAFF },
    select: { id: true }
  });

  if (allEducators.length === 0) {
    console.log('⚠️  Aucun staff trouvé pour assigner comme éducateur');
  } else {
    let educatorIndex = 0;
    let journalsCreated = 0;
    
    for (const child of allChildren) {
      // Assigner un éducateur principal à cet enfant
      const assignedEducator = allEducators[educatorIndex % allEducators.length];
      educatorIndex++;
      
      // Générer pour chaque période
      for (const { year, month } of periods) {
        // Trouver l'année scolaire correspondante
        // Une année scolaire 2024-2025 couvre septembre 2024 à août 2025
        let academicYear;
        if (month >= 9) {
          // Septembre à décembre : année scolaire commence cette année
          academicYear = academicYears.find(ay => ay.label === `${year}-${year + 1}`);
        } else {
          // Janvier à août : année scolaire a commencé l'année précédente
          academicYear = academicYears.find(ay => ay.label === `${year - 1}-${year}`);
        }
        
        if (!academicYear) {
          console.log(`⚠️  Année scolaire non trouvée pour ${month}/${year}`);
          continue;
        }
        
        // Vérifier si le journal existe déjà
        const existingJournal = await prisma.journalMensuel.findFirst({
          where: {
            childId: child.id,
            academicYearId: academicYear.id,
            month: month
          }
        });
        
        if (!existingJournal) {
          // Récupérer les missions de l'enfant pour cette année
          const childMissions = await prisma.mission.findMany({
            where: { childId: child.id, academicYearId: academicYear.id }
          });
          
          // Créer un objet de progression des missions
          const progressionMissions = childMissions.reduce((acc, mission) => {
            acc[mission.id] = {
              progression: faker.helpers.arrayElement([
                "En cours de travail",
                "Objectif en cours d'acquisition",
                "Progrès observés",
                "Objectif partiellement atteint",
                "Objectif atteint"
              ]),
              commentaire: faker.helpers.arrayElement([
                "L'enfant montre de l'intérêt et s'investit dans cette mission.",
                "Des progrès sont observés, il faut poursuivre les efforts.",
                "Cette mission nécessite un accompagnement renforcé.",
                "L'enfant a bien intégré les objectifs de cette mission.",
                "Excellent travail, l'enfant dépasse nos attentes."
              ])
            };
            return acc;
          }, {});
          
          // Déterminer le statut du journal (draft ou submitted)
          const isDraft = faker.datatype.boolean(0.3); // 30% de chance d'être en draft
          const isSubmitted = !isDraft && faker.datatype.boolean(0.8); // 80% des non-drafts sont soumis
          
          await prisma.journalMensuel.create({
            data: {
              childId: child.id,
              educatorId: assignedEducator.id,
              academicYearId: academicYear.id,
              month: month,
              isDraft: isDraft,
              isSubmitted: isSubmitted,
              submittedAt: isSubmitted ? faker.date.between({
                from: new Date(year, month - 1, 20), // vers le 20 du mois
                to: new Date(year, month, 5) // jusqu'au 5 du mois suivant
              }) : null,
              contenu: faker.helpers.arrayElement(journalTemplates),
              progressionMissions: progressionMissions
            }
          });
          
          journalsCreated++;
        }
      }
    }
    console.log(`✅ ${journalsCreated} journaux mensuels créés pour tous les enfants`);
  }
}

main().then(() => console.log('🌱 Seed terminé')).catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
