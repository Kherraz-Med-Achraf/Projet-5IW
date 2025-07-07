import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { EventModule } from './event.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import * as passport from 'passport';
import { EventService } from './event.service';
import { CanActivate, ExecutionContext } from '@nestjs/common';

class PrismaMock { event = { create: jest.fn() } as any; }

const mockJwtGuard = (user: { id: string; role: Role }) => ({
  canActivate: (ctx: any) => { ctx.switchToHttp().getRequest().user = user; return true; },
});

// Enregistre une stratégie JWT factice pour éviter « Unknown authentication strategy »
class DummyStrategy { name = 'jwt'; authenticate() { (this as any).success({}, null); } }
passport.use(new DummyStrategy() as any);

const NoopGuard = { canActivate: () => true };

class EventServiceMock { create = jest.fn().mockResolvedValue({ id: 'ev' }); }

class TestRolesGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const rolesAllowed = ['DIRECTOR','SERVICE_MANAGER'];
    const req = ctx.switchToHttp().getRequest();
    return rolesAllowed.includes(req.user.role);
  }
}

describe('EventController roles', () => {
  let app: INestApplication; let prisma: PrismaMock;

  const boot = async (role: Role) => {
    prisma = new PrismaMock();
    const mod = await Test.createTestingModule({ imports: [EventModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(EventService).useValue(new EventServiceMock())
      .overrideGuard(JwtAuthGuard).useValue(mockJwtGuard({ id: 'u1', role }))
      .overrideGuard(require('../common/guards/roles.guard').RolesGuard).useValue(new TestRolesGuard())
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