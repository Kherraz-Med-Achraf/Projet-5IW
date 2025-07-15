import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';

describe('EventService', () => {
  let service: EventService;
  let prisma: PrismaService;
  let mailService: MailService;

  const mockPrismaService = {
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventRegistration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    eventRegistrationChild: {
      count: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    parentProfile: {
      findUnique: jest.fn(),
    },
    child: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    prisma = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listUpcoming', () => {
    it('should return upcoming events with capacity left', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Event 1',
          date: new Date('2024-01-06'), // Saturday
          capacity: 10,
        },
        {
          id: 'event-2',
          title: 'Event 2',
          date: new Date('2024-01-13'), // Saturday
          capacity: null,
        },
      ];

      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.eventRegistrationChild.count
        .mockResolvedValueOnce(3) // 3 children registered for event-1
        .mockResolvedValueOnce(0); // 0 children registered for event-2

      const result = await service.listUpcoming();

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: { date: { gte: expect.any(Date) } },
        orderBy: { date: 'asc' },
      });
      expect(result).toEqual([
        { ...mockEvents[0], capacityLeft: 7 }, // 10 - 3 = 7
        { ...mockEvents[1], capacityLeft: null },
      ]);
    });

    it('should return empty array when no upcoming events', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const result = await service.listUpcoming();

      expect(result).toEqual([]);
    });

    it('should handle capacity overflow', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Full Event',
          date: new Date('2024-01-06'),
          capacity: 5,
        },
      ];

      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.eventRegistrationChild.count.mockResolvedValue(8); // More than capacity

      const result = await service.listUpcoming();

      expect(mockPrismaService.eventRegistrationChild.count).toHaveBeenCalledWith({
        where: { registration: { eventId: 'event-1' } }
      });
      expect(result[0].capacityLeft).toBe(0); // Math.max(5 - 8, 0) = 0
    });
  });

  describe('create', () => {
    const createEventDto = {
      title: 'Test Event',
      description: 'Test Description',
      date: '2024-01-06', // Saturday
      startTime: '10:00',
      endTime: '12:00',
      price: 25.50,
      capacity: 20,
    };

    it('should create an event successfully', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        description: 'Test Description',
        date: new Date('2024-01-06'),
        startTime: new Date('2024-01-06T10:00:00'),
        endTime: new Date('2024-01-06T12:00:00'),
        priceCt: 2550,
        capacity: 20,
        imageUrl: 'test-image.jpg',
        createdByUserId: 'user-1',
      };

      mockPrismaService.event.create.mockResolvedValue(mockEvent);

      const result = await service.create(createEventDto, 'user-1', 'test-image.jpg');

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Event',
          description: 'Test Description',
          date: new Date('2024-01-06'),
          startTime: new Date('2024-01-06T10:00:00'),
          endTime: new Date('2024-01-06T12:00:00'),
          priceCt: 2550, // 25.50 * 100
          capacity: 20,
          imageUrl: 'test-image.jpg',
          createdByUserId: 'user-1',
        },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should throw BadRequestException when date is not Saturday', async () => {
      const invalidDto = { ...createEventDto, date: '2024-01-05' }; // Friday

      await expect(service.create(invalidDto, 'user-1')).rejects.toThrow(
        new BadRequestException('La date doit être un samedi')
      );
    });

    it('should throw BadRequestException when end time is before start time', async () => {
      const invalidDto = { ...createEventDto, startTime: '12:00', endTime: '10:00' };

      await expect(service.create(invalidDto, 'user-1')).rejects.toThrow(
        new BadRequestException('Heure de fin invalide')
      );
    });

         it('should handle null capacity', async () => {
       const { capacity, ...dtoWithoutCapacity } = createEventDto;

      const mockEvent = { id: 'event-1', capacity: null };
      mockPrismaService.event.create.mockResolvedValue(mockEvent);

      await service.create(dtoWithoutCapacity, 'user-1');

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          capacity: null,
        }),
      });
    });

    it('should handle price conversion to cents correctly', async () => {
      const priceTests = [
        { price: 0, expectedCents: 0 },
        { price: 10, expectedCents: 1000 },
        { price: 15.99, expectedCents: 1599 },
        { price: 0.01, expectedCents: 1 },
      ];

      for (const test of priceTests) {
        const dto = { ...createEventDto, price: test.price };
        mockPrismaService.event.create.mockResolvedValue({ id: 'test' });

        await service.create(dto, 'user-1');

        expect(mockPrismaService.event.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            priceCt: test.expectedCents,
          }),
        });
      }
    });
  });

  describe('update', () => {
    const existingEvent = {
      id: 'event-1',
      title: 'Existing Event',
      date: new Date('2024-01-06'),
      isLocked: false,
    };

    const updateDto = {
      title: 'Updated Event',
      description: 'Updated Description',
      price: 30,
    };

    it('should update event successfully for DIRECTOR', async () => {
      const updatedEvent = { ...existingEvent, ...updateDto };

      mockPrismaService.event.findUnique.mockResolvedValue(existingEvent);
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      const result = await service.update('event-1', updateDto, Role.DIRECTOR);

      expect(mockPrismaService.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
      expect(mockPrismaService.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          title: 'Updated Event',
          description: 'Updated Description',
          priceCt: 3000, // 30 * 100
        },
      });
      expect(result).toEqual(updatedEvent);
    });

    it('should update event successfully for SERVICE_MANAGER', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(existingEvent);
      mockPrismaService.event.update.mockResolvedValue(existingEvent);

      await service.update('event-1', updateDto, Role.SERVICE_MANAGER);

      expect(mockPrismaService.event.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      await expect(service.update('event-1', updateDto, Role.DIRECTOR)).rejects.toThrow(
        new NotFoundException('Événement introuvable')
      );
    });

    it('should throw ForbiddenException when event is locked', async () => {
      const lockedEvent = { ...existingEvent, isLocked: true };
      mockPrismaService.event.findUnique.mockResolvedValue(lockedEvent);

      await expect(service.update('event-1', updateDto, Role.DIRECTOR)).rejects.toThrow(
        new ForbiddenException('Événement verrouillé après inscriptions')
      );
    });

    it('should throw ForbiddenException for unauthorized roles', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(existingEvent);

      const unauthorizedRoles = [Role.PARENT, Role.STAFF, Role.SECRETARY];

      for (const role of unauthorizedRoles) {
        await expect(service.update('event-1', updateDto, role)).rejects.toThrow(
          new ForbiddenException()
        );
      }
    });

    it('should throw BadRequestException for negative price', async () => {
      const invalidDto = { ...updateDto, price: -10 };
      mockPrismaService.event.findUnique.mockResolvedValue(existingEvent);

      await expect(service.update('event-1', invalidDto, Role.DIRECTOR)).rejects.toThrow(
        new BadRequestException('Le prix doit être positif')
      );
    });

    it('should handle partial updates', async () => {
      const partialDto = { title: 'New Title Only' };
      mockPrismaService.event.findUnique.mockResolvedValue(existingEvent);
      mockPrismaService.event.update.mockResolvedValue(existingEvent);

      await service.update('event-1', partialDto, Role.DIRECTOR);

      expect(mockPrismaService.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { title: 'New Title Only' },
      });
    });

    it('should handle time updates correctly', async () => {
      const timeDto = {
        date: '2024-01-13',
        startTime: '14:00',
        endTime: '16:00',
      };

      mockPrismaService.event.findUnique.mockResolvedValue(existingEvent);
      mockPrismaService.event.update.mockResolvedValue(existingEvent);

      await service.update('event-1', timeDto, Role.DIRECTOR);

      expect(mockPrismaService.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          date: new Date('2024-01-13'),
          startTime: new Date('2024-01-13T14:00:00'),
          endTime: new Date('2024-01-13T16:00:00'),
        },
      });
    });
  });

  describe('register', () => {
    const mockParentProfile = {
      id: 1,
      userId: 'user-1',
    };

    const mockEvent = {
      id: 'event-1',
      title: 'Test Event',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };

         const registerDto = {
       childIds: [1, 2],
       paymentMethod: PaymentMethod.CHEQUE,
     };

    beforeEach(() => {
      mockPrismaService.parentProfile.findUnique.mockResolvedValue(mockParentProfile);
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue(null);
    });

    it('should register successfully', async () => {
      const mockChildren = [
        { id: 1, firstName: 'Child1', parentProfileId: 1 },
        { id: 2, firstName: 'Child2', parentProfileId: 1 },
      ];

      const mockRegistration = {
        id: 'reg-1',
        eventId: 'event-1',
        parentProfileId: 1,
        paymentMethod: PaymentMethod.CHEQUE,
        paymentStatus: PaymentStatus.PENDING,
      };

      mockPrismaService.child.findMany.mockResolvedValue(mockChildren);
      
      // Mock transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          event: { findUnique: jest.fn().mockResolvedValue(mockEvent) },
          eventRegistrationChild: { 
            count: jest.fn().mockResolvedValue(0),
            createMany: jest.fn().mockResolvedValue({ count: 2 })
          },
          eventRegistration: { create: jest.fn().mockResolvedValue(mockRegistration) },
        };
        return callback(mockTx);
      });

      const result = await service.register('event-1', 'user-1', registerDto, 'http://localhost');

      expect(mockPrismaService.parentProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrismaService.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
      expect(mockPrismaService.child.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] }, parentProfileId: 1 },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when parent profile not found', async () => {
      mockPrismaService.parentProfile.findUnique.mockResolvedValue(null);

      await expect(service.register('event-1', 'user-1', registerDto, 'http://localhost'))
        .rejects.toThrow(new NotFoundException('Profil parent introuvable'));
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      await expect(service.register('event-1', 'user-1', registerDto, 'http://localhost'))
        .rejects.toThrow(new NotFoundException('Événement introuvable'));
    });

    it('should throw BadRequestException for past events', async () => {
      const pastEvent = {
        ...mockEvent,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };
      mockPrismaService.event.findUnique.mockResolvedValue(pastEvent);

      await expect(service.register('event-1', 'user-1', registerDto, 'http://localhost'))
        .rejects.toThrow(new BadRequestException('Événement passé'));
    });

    it('should throw BadRequestException when already registered', async () => {
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue({
        id: 'existing-reg',
      });

      await expect(service.register('event-1', 'user-1', registerDto, 'http://localhost'))
        .rejects.toThrow(new BadRequestException('Vous êtes déjà inscrit'));
    });

    it('should throw BadRequestException when no children selected', async () => {
      const emptyDto = { ...registerDto, childIds: [] };

      await expect(service.register('event-1', 'user-1', emptyDto, 'http://localhost'))
        .rejects.toThrow(new BadRequestException('Au moins un enfant doit être inscrit'));
    });

    it('should handle different payment methods', async () => {
      const mockChildren = [{ id: 1, firstName: 'Child1', parentProfileId: 1 }];
      mockPrismaService.child.findMany.mockResolvedValue(mockChildren);

             const paymentMethods = [PaymentMethod.CHEQUE, PaymentMethod.STRIPE];

      for (const paymentMethod of paymentMethods) {
        const dto = { ...registerDto, childIds: [1], paymentMethod };
        mockPrismaService.eventRegistration.create.mockResolvedValue({
          id: 'reg-1',
          paymentMethod,
        });

        const result = await service.register('event-1', 'user-1', dto, 'http://localhost');
        expect(result).toBeDefined();
      }
    });
  });

  describe('listRegistrations', () => {
    it('should return registrations for an event', async () => {
      const mockRegistrations = [
        {
          id: 'reg-1',
          eventId: 'event-1',
          parentProfile: {
            id: 1,
            firstName: 'Parent1',
            user: { email: 'parent1@example.com' },
          },
          children: [
            { child: { id: 1, firstName: 'Child1', lastName: 'Doe' } },
          ],
        },
      ];

      mockPrismaService.eventRegistration.findMany.mockResolvedValue(mockRegistrations);

      const result = await service.listRegistrations('event-1');

      expect(mockPrismaService.eventRegistration.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
        include: {
          parentProfile: { include: { user: true } },
          children: { include: { child: true } },
        },
      });
      expect(result).toEqual(mockRegistrations);
    });
  });

  describe('listMyEvents', () => {
    it('should return events for a parent', async () => {
      const mockParentProfile = { id: 1, userId: 'user-1' };
      const mockRegistrations = [
        {
          id: 'reg-1',
          eventId: 'event-1',
          event: {
            title: 'Test Event',
            date: new Date('2024-01-06'),
          },
          children: [
            { child: { firstName: 'Child1', lastName: 'Doe' } },
          ],
          paymentStatus: PaymentStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.parentProfile.findUnique.mockResolvedValue(mockParentProfile);
      mockPrismaService.eventRegistration.findMany.mockResolvedValue(mockRegistrations);

      const result = await service.listMyEvents('user-1');

      expect(result).toEqual([
        {
          registrationId: 'reg-1',
          eventId: 'event-1',
          eventTitle: 'Test Event',
          eventDate: new Date('2024-01-06'),
          children: ['Child1 Doe'],
          paymentStatus: PaymentStatus.PENDING,
        },
      ]);
    });

    it('should return empty array when parent profile not found', async () => {
      mockPrismaService.parentProfile.findUnique.mockResolvedValue(null);

      const result = await service.listMyEvents('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle Saturday validation correctly', async () => {
      // Test all days of the week
      const dates = [
        { date: '2024-01-01', day: 'Monday', shouldFail: true },
        { date: '2024-01-02', day: 'Tuesday', shouldFail: true },
        { date: '2024-01-03', day: 'Wednesday', shouldFail: true },
        { date: '2024-01-04', day: 'Thursday', shouldFail: true },
        { date: '2024-01-05', day: 'Friday', shouldFail: true },
        { date: '2024-01-06', day: 'Saturday', shouldFail: false },
        { date: '2024-01-07', day: 'Sunday', shouldFail: true },
      ];

      for (const { date, day, shouldFail } of dates) {
        const dto = {
          title: 'Test',
          description: 'Test',
          date,
          startTime: '10:00',
          endTime: '12:00',
          price: 10,
        };

        if (shouldFail) {
          await expect(service.create(dto, 'user-1')).rejects.toThrow(
            new BadRequestException('La date doit être un samedi')
          );
        } else {
          mockPrismaService.event.create.mockResolvedValue({ id: 'test' });
          await expect(service.create(dto, 'user-1')).resolves.toBeDefined();
        }
      }
    });

    it('should handle price precision correctly', async () => {
      const dto = {
        title: 'Test',
        description: 'Test',
        date: '2024-01-06',
        startTime: '10:00',
        endTime: '12:00',
        price: 12.345, // Should round to 1235 cents
      };

      mockPrismaService.event.create.mockResolvedValue({ id: 'test' });

      await service.create(dto, 'user-1');

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priceCt: 1235, // Math.round(12.345 * 100)
        }),
      });
    });

    it('should handle timezone considerations in date validation', async () => {
      // Test with different time zones - the date string should be parsed consistently
      const dto = {
        title: 'Test',
        description: 'Test',
        date: '2024-01-06', // Saturday in UTC
        startTime: '10:00',
        endTime: '12:00',
        price: 10,
      };

      mockPrismaService.event.create.mockResolvedValue({ id: 'test' });

      await expect(service.create(dto, 'user-1')).resolves.toBeDefined();
    });
  });
}); 