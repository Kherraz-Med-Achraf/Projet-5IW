import { PrismaClient, Role, Discipline } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();
const HASH_ROUNDS = 10;
const DEFAULT_PWD  = 'Test1234!!!!';

async function hash(pwd: string) {
  return bcrypt.hash(pwd, HASH_ROUNDS);
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
    const pwdHash = await hash(DEFAULT_PWD);
    const usr = await prisma.user.create({
      data: {
        email: directorMail,
        password: pwdHash,
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
      const last  = faker.person.lastName();
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
  const totalParents = 35 + 5;
  for (let p = 0; p < totalParents; p++) {
    const firstP = faker.person.firstName();
    const lastP  = faker.person.lastName();
    const email  = `parent${p + 1}@example.com`;
    const childCount = p < 35 ? 1 : 2;
    const childrenData = Array.from({ length: childCount }).map(() => ({
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
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
            lastName : lastP,
            phone: '06' + faker.string.numeric(8),
            address: faker.location.streetAddress(),
            legalResponsibility: 'Père/Mère',
            notificationPrefs: {},
            emergencyContacts: {
              create: [{
                name     : faker.person.fullName(),
                phone: '06' + faker.string.numeric(8),
                relation : 'Tante',
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
  /* 7. ANNÉES SCOLAIRES                                                     */
  /* ---------------------------------------------------------------------- */
  const existingYears = await prisma.academicYear.findMany({
    where: { label: { in: ['2025-2026', '2026-2027', '2027-2028'] } },
    select: { label: true },
  });
  const existingLabels = existingYears.map(y => y.label);
  const yearsToCreate = [
    { label: '2025-2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-08-31') },
    { label: '2026-2027', startDate: new Date('2026-09-01'), endDate: new Date('2027-08-31') },
    { label: '2027-2028', startDate: new Date('2027-09-01'), endDate: new Date('2028-08-31') },
  ].filter(y => !existingLabels.includes(y.label));

  for (const yr of yearsToCreate) {
    await prisma.academicYear.create({ data: yr });
  }
  console.log('✅ Années scolaires insérées');

  /* ---------------------------------------------------------------------- */
  /* 8. RÉFÉRENTS                                                           */
  /* ---------------------------------------------------------------------- */
  const allChildren = await prisma.child.findMany({ select: { id: true } });
  const allStaff    = await prisma.user.findMany({
    where: { role: Role.STAFF },
    select: { id: true },
  });

  let staffIndex = 0;
  let countForCurrent = 0;
  const maxPerStaff = 5;
  for (const { id: childId } of allChildren) {
    const referentId = allStaff[staffIndex]?.id;
    if (referentId) {
      await prisma.child.update({
        where: { id: childId },
        data: { referents: { connect: { id: referentId } } },
      });
      countForCurrent++;
      if (countForCurrent >= maxPerStaff) {
        countForCurrent = 0;
        staffIndex = Math.min(staffIndex + 1, allStaff.length - 1);
      }
    }
  }
  console.log('✅ Référents assignés');

  /* ---------------------------------------------------------------------- */
  /* 9. PRÉSENCES & JUSTIFICATIONS (janv → juin 2025)                      */
  /* ---------------------------------------------------------------------- */
  const startOfDayUTC = (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const childIds = allChildren.map(c => c.id);
  const staffIds = allStaff.map(u => u.id);
  let staffCursor = 0;
  const nextStaffId = () => {
    const id = staffIds[staffCursor];
    staffCursor = (staffCursor + 1) % staffIds.length;
    return id;
  };

  for (let d = new Date('2025-01-01'); d <= new Date('2025-06-30'); d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;

    const dayStart = startOfDayUTC(d);
    const sheet = await prisma.presenceSheet.upsert({
      where: { date: dayStart },
      create: {
        date: dayStart,
        staffId: nextStaffId(),
        status: 'PENDING_SECRETARY',
        validatedAtStaff: faker.date.between({
          from: new Date(dayStart.getTime() - 2 * 60 * 60 * 1000),
          to: new Date(dayStart.getTime() - 30 * 60 * 1000),
        }),
      },
      update: {},
    });

    for (const childId of childIds) {
      // 70% de chance d’être présent
      const isPresent = faker.number.float({ min: 0, max: 1, precision: 0.01 }) < 0.7;
      const record = await prisma.presenceRecord.create({
        data: { sheetId: sheet.id, childId, present: isPresent },
      });

      if (!isPresent && faker.datatype.boolean()) {
        const type = faker.helpers.arrayElement(['ABSENCE', 'LATENESS'] as const);
        await prisma.absenceJustification.create({
          data: {
            recordId:         record.id,
            type,
            justificationDate: dayStart,
            motif: type === 'ABSENCE'
              ? faker.helpers.arrayElement(['Certificat médical', 'RDV familial', 'Congé exceptionnel'])
              : '',
            filePath: faker.datatype.boolean()
              ? `uploads/justifications/${faker.string.uuid()}.pdf`
              : null,
          },
        });
      }
    }
  }

  console.log('✅ Présences et justifications générées pour janvier→juin 2025');
}

main()
  .then(() => console.log('🌱 Seed terminé'))
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
