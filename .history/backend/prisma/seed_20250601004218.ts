// backend/prisma/seed.ts

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();

  // 1) Si un ADMIN existe déjà, on arrête
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });
  if (existingAdmin) {
    console.log('⚠️ Un admin existe déjà. Seed interrompu.');
    return;
  }

  // 2) Sinon, on crée l’ADMIN
  const email = 'admin@example.com';
  const plainPassword = 'MonMotDePasse123!';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: email,
      password: passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`✅ Admin créé : ${admin.email} / Mot de passe : ${plainPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await new PrismaClient().$disconnect();
    process.exit(0);
  });
