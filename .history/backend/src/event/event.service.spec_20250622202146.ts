import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

class PrismaMock {
  event = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  } as any;
  parentProfile = { findUnique: jest.fn() } as any;
  eventRegistration = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  } as any;
  eventRegistrationChild = {
    count: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  } as any;
  child = {
    findMany: jest.fn(),
  } as any;
  $transaction = jest.fn().mockImplementation(fn => fn(this));
}

describe('EventService basics', () => {
  let svc: EventService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = new PrismaMock();
    const mail = { sendMail: jest.fn() } as unknown as MailService;
    svc = new EventService(prisma as unknown as PrismaService, mail);
  });

  it("refuse la création si la date n'est pas un samedi", async () => {
    const dto: any = {
      title: 'Test', description: '', date: '2025-06-20', // vendredi
      startTime: '10:00', endTime: '11:00', price: 0,
    };
    await expect(svc.create(dto, 'creator')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse inscription si capacité dépassée', async () => {
    prisma.parentProfile.findUnique.mockResolvedValue({ id: 1 });
    prisma.event.findUnique.mockResolvedValue({ id: 'ev', date: new Date('2100-06-21'), capacity: 1, priceCt: 0 });
    prisma.eventRegistrationChild.count.mockResolvedValue(1); // déjà plein
    prisma.child.findMany.mockResolvedValue([{ id: 1 }]);
    const dto: any = { childIds: [1], paymentMethod: PaymentMethod.CHEQUE };
    await expect(svc.register('ev', 'u1', dto, 'http://front'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('annulation refuse si parent non propriétaire', async () => {
    prisma.eventRegistration.findUnique = jest.fn().mockResolvedValue({
      id: 'reg1', parentProfile: { userId: 'owner' }, paymentMethod: PaymentMethod.CHEQUE,
      paymentStatus: PaymentStatus.PENDING, event: {},
    });
    await expect(svc.cancelRegistration('intrus', 'reg1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
}); 