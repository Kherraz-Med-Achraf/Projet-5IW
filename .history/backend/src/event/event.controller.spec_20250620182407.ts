import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { EventModule } from './event.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';

class PrismaMock { event = { create: jest.fn() } as any; }

const mockJwtGuard = (user: { id: string; role: Role }) => ({
  canActivate: (ctx: any) => { ctx.switchToHttp().getRequest().user = user; return true; },
});

describe('EventController roles', () => {
  let app: INestApplication; let prisma: PrismaMock;

  const boot = async (role: Role) => {
    prisma = new PrismaMock();
    const mod = await Test.createTestingModule({ imports: [EventModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideGuard(JwtAuthGuard).useValue(mockJwtGuard({ id: 'u1', role }))
      .compile();
    app = mod.createNestApplication(); await app.init();
  };
  afterEach(async () => { await app.close(); });

  const body = { title:'E', date:'2100-06-24', startTime:'10:00', endTime:'11:00', price:0 };

  it('Director autorisé', async () => { await boot(Role.DIRECTOR);
    await request(app.getHttpServer()).post('/events').send(body).expect(201);
    expect(prisma.event.create).toHaveBeenCalled();
  });
  it('Service Manager autorisé', async () => { await boot(Role.SERVICE_MANAGER);
    await request(app.getHttpServer()).post('/events').send(body).expect(201);
  });
  it('Staff interdit', async () => { await boot(Role.STAFF);
    await request(app.getHttpServer()).post('/events').send(body).expect(403);
  });
  it('Parent interdit', async () => { await boot(Role.PARENT as any);
    await request(app.getHttpServer()).post('/events').send(body).expect(403);
  });
}); 