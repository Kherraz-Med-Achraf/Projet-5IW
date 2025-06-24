import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/mail/mail.service';
import { Role } from '@prisma/client';

// Mot de passe admin / invité
const PWD = 'Password123!!';

// Mock MailService pour ne pas envoyer de vrais emails
class MailMock {
  public sent: { to: string; html: string }[] = [];
  async sendMail(to: string, _subj: string, html: string) {
    this.sent.push({ to, html });
  }
}

describe('Flux invitation + inscription (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mail = new MailMock();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    await prisma.invitation.deleteMany({});
    await prisma.user.deleteMany({});

    // Création admin
    const adminPass = await bcrypt.hash(PWD, 10);
    await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: adminPass,
        role: Role.ADMIN,
        emailVerified: true,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin → invite puis inscription parent', async () => {
    /* 1. Login admin */
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: PWD })
      .expect(201);
    const adminToken = loginRes.body.access_token as string;

    /* 2. Création invitation */
    const inviteEmail = 'parent1@example.com';
    const invRes = await request(app.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: inviteEmail, roleToAssign: 'PARENT' })
      .expect(201);

    expect(invRes.body).toHaveProperty('token');
    const token = invRes.body.token as string;

    // Lien dans le mail simulé
    expect(mail.sent.at(-1)?.to).toBe(inviteEmail);
    expect(mail.sent.at(-1)?.html).toContain(token);

    /* 3. Validation du token   */
    await request(app.getHttpServer())
      .get(`/invitations/validate/${token}`)
      .expect(200);

    /* 4. Inscription via /auth/register-by-invite */
    const pwd = 'LongPwd123!!';
    await request(app.getHttpServer())
      .post('/auth/register-by-invite')
      .send({
        token,
        email: inviteEmail,
        password: pwd,
        passwordConfirm: pwd,
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '0600000000',
        address: '1 rue de la Paix',
        legalResponsibility: 'Mère',
        children: [],
        emergencyContacts: [],
      })
      .expect(201);

    /* 5. Vérifications persistance */
    const newUser = await prisma.user.findUnique({ where: { email: inviteEmail } });
    expect(newUser).toBeTruthy();
    expect(newUser?.role).toBe(Role.PARENT);
    const usedInv = await prisma.invitation.findUnique({ where: { token } });
    expect(usedInv?.used).toBe(true);
  });
}); 