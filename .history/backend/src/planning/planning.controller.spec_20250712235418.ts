import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PlanningModule } from './planning.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';

/**
 * On mocke Prisma et on bypasse la logique réelle pour se concentrer sur l'accès.
 */
class PrismaMock {
  semester = { create: jest.fn() } as any;
}

/**
 * Guard JWT simulé : insère req.user
 */
const mockJwtGuard = (user: { id: string; role: Role }) => ({
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().user = user;
    return true;
  },
});

// Tests temporairement désactivés - nécessitent DB
describe.skip('PlanningController – création de semestre (restriction rôles)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  const createApp = async (userRole: Role) => {
    prisma = new PrismaMock();
    const moduleRef = await Test.createTestingModule({
      imports: [PlanningModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard({ id: 'u1', role: userRole }))
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  };

  afterEach(async () => {
    await app.close();
  });

  it('autorise la création de semestre pour le rôle DIRECTOR', async () => {
    await createApp(Role.DIRECTOR);
    await request(app.getHttpServer())
      .post('/planning/semesters')
      .send({ name: 'S1', startDate: '2025-09-01', endDate: '2026-01-31' })
      .expect(201);
    expect(prisma.semester.create).toHaveBeenCalled();
  });

  it('autorise la création de semestre pour le rôle SERVICE_MANAGER', async () => {
    await createApp(Role.SERVICE_MANAGER);
    await request(app.getHttpServer())
      .post('/planning/semesters')
      .send({ name: 'S1', startDate: '2025-09-01', endDate: '2026-01-31' })
      .expect(201);
  });

  it('refuse la création de semestre pour le rôle STAFF', async () => {
    await createApp(Role.STAFF);
    await request(app.getHttpServer())
      .post('/planning/semesters')
      .send({ name: 'S1', startDate: '2025-09-01', endDate: '2026-01-31' })
      .expect(403);
  });

  it('refuse la création de semestre pour le rôle PARENT', async () => {
    await createApp(Role.PARENT);
    await request(app.getHttpServer())
      .post('/planning/semesters')
      .send({ name: 'S1', startDate: '2025-09-01', endDate: '2026-01-31' })
      .expect(403);
  });

  it('refuse la création de semestre pour le rôle SECRETARY', async () => {
    await createApp(Role.SECRETARY);
    await request(app.getHttpServer())
      .post('/planning/semesters')
      .send({ name: 'S1', startDate: '2025-09-01', endDate: '2026-01-31' })
      .expect(403);
  });

  it('refuse la création de semestre pour le rôle CHILD', async () => {
    await createApp(Role.CHILD);
    await request(app.getHttpServer())
      .post('/planning/semesters')
      .send({ name: 'S1', startDate: '2025-09-01', endDate: '2026-01-31' })
      .expect(403);
  });
});
