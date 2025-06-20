import { ForbiddenException } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Mock minimal de Prisma – seules les méthodes utilisées par getChildSchedule sont implémentées.
 */
class PrismaMock {
  child = {
    findUnique: jest.fn(),
  } as any;
  entryChild = {
    findMany: jest.fn(),
  } as any;
  semester = {
    findUnique: jest.fn(),
  } as any;
  eventRegistrationChild = {
    findMany: jest.fn(),
  } as any;
}

describe('PlanningService – getChildSchedule()', () => {
  let svc: PlanningService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = new PrismaMock();
    svc = new PlanningService(prisma as unknown as PrismaService);
  });

  it('autorise le parent propriétaire', async () => {
    prisma.child.findUnique.mockResolvedValue({
      parent: { userId: 'parent-1' },
    });
    prisma.entryChild.findMany.mockResolvedValue([]); // pas nécessaire ici
    prisma.semester.findUnique.mockResolvedValue(null);
    const result = await svc.getChildSchedule('sem-1', '42', 'parent-1');
    expect(result).toEqual([]);
  });

  it("refuse l'accès à un autre parent", async () => {
    prisma.child.findUnique.mockResolvedValue({
      parent: { userId: 'parent-owner' },
    });
    await expect(
      svc.getChildSchedule('sem-1', '42', 'intrus')
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
}); 