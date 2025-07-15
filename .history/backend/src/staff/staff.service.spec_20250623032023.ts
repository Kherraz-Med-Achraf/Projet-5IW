import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role, Discipline } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    staffProfile: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createStaffDto = {
      email: 'staff@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '0123456789',
      discipline: Discipline.EDUCATOR,
      birthDate: '1990-01-01',
      specialty: 'Special Education',
    };

    it('should create a staff member successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'staff@example.com',
        role: Role.STAFF,
      };

      const mockProfile = {
        id: 1,
        userId: 'user-id',
        firstName: 'John',
        lastName: 'Doe',
        phone: '0123456789',
        discipline: Discipline.EDUCATOR,
        birthDate: new Date('1990-01-01'),
        specialty: 'Special Education',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          staffProfile: { create: jest.fn().mockResolvedValue(mockProfile) },
        });
      });

      const result = await service.create(createStaffDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'staff@example.com' },
      });
      expect(mockPrismaService.staffProfile.findFirst).toHaveBeenCalledWith({
        where: { firstName: 'John', lastName: 'Doe' },
      });
      expect(result).toEqual({
        id: 1,
        userId: 'user-id',
        firstName: 'John',
        lastName: 'Doe',
        phone: '0123456789',
        discipline: Discipline.EDUCATOR,
        birthDate: new Date('1990-01-01'),
        specialty: 'Special Education',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        user: mockUser,
      });
    });

    it('should throw BadRequestException when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(createStaffDto)).rejects.toThrow(
        new BadRequestException('Email déjà utilisé')
      );

      expect(mockPrismaService.staffProfile.findFirst).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when staff profile already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.staffProfile.findFirst.mockResolvedValue({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(service.create(createStaffDto)).rejects.toThrow(
        new BadRequestException('Un profil staff "John Doe" existe déjà.')
      );
    });

    it('should hash password before storing', async () => {
      const mockUser = { id: 'user-id', email: 'staff@example.com', role: Role.STAFF };
      const mockProfile = { id: 1, userId: 'user-id' };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);

      const mockTxUser = { create: jest.fn().mockResolvedValue(mockUser) };
      const mockTxProfile = { create: jest.fn().mockResolvedValue(mockProfile) };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: mockTxUser,
          staffProfile: mockTxProfile,
        });
      });

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      await service.create(createStaffDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(mockTxUser.create).toHaveBeenCalledWith({
        data: {
          email: 'staff@example.com',
          password: 'hashed-password',
          role: Role.STAFF,
          emailVerified: true,
        },
      });
    });

    it('should handle different disciplines', async () => {
      const disciplines = [
        Discipline.EDUCATOR,
        Discipline.TECH_EDUCATOR,
        Discipline.PSYCHOLOGIST,
        Discipline.PSYCHIATRIST,
        Discipline.ORTHOPEDIST,
      ];

      for (const discipline of disciplines) {
        const dto = { ...createStaffDto, discipline, email: `${discipline}@example.com` };
        
        mockPrismaService.user.findUnique.mockResolvedValue(null);
        mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return callback({
            user: { create: jest.fn().mockResolvedValue({ id: 'user-id' }) },
            staffProfile: { create: jest.fn().mockResolvedValue({ id: 1, discipline }) },
          });
        });

        const result = await service.create(dto);
        expect(result.discipline).toBe(discipline);
      }
    });
  });

  describe('findAll', () => {
    it('should return all staff profiles', async () => {
      const mockStaffProfiles = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          user: { id: 'user-1', email: 'john@example.com' },
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          user: { id: 'user-2', email: 'jane@example.com' },
        },
      ];

      mockPrismaService.staffProfile.findMany.mockResolvedValue(mockStaffProfiles);

      const result = await service.findAll();

      expect(mockPrismaService.staffProfile.findMany).toHaveBeenCalledWith({
        include: { user: true },
      });
      expect(result).toEqual(mockStaffProfiles);
    });

    it('should return empty array when no staff profiles exist', async () => {
      mockPrismaService.staffProfile.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return staff profile by id', async () => {
      const mockProfile = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        user: { id: 'user-1', email: 'john@example.com' },
      };

      mockPrismaService.staffProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.findOne(1);

      expect(mockPrismaService.staffProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { user: true },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundException when staff profile not found', async () => {
      mockPrismaService.staffProfile.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Staff 999 introuvable')
      );
    });
  });

  describe('update', () => {
    const existingProfile = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      phone: '0123456789',
      discipline: Discipline.EDUCATOR,
      birthDate: new Date('1990-01-01'),
      specialty: 'Special Education',
    };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(existingProfile as any);
    });

    it('should update staff profile successfully', async () => {
      const updateDto = {
        firstName: 'Jane',
        phone: '0987654321',
        specialty: 'Advanced Education',
      };

      const updatedProfile = { ...existingProfile, ...updateDto };

      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.staffProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.update(1, updateDto);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockPrismaService.staffProfile.findFirst).toHaveBeenCalledWith({
        where: {
          id: { not: 1 },
          firstName: 'Jane',
          lastName: 'Doe',
        },
      });
      expect(mockPrismaService.staffProfile.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          firstName: 'Jane',
          phone: '0987654321',
          specialty: 'Advanced Education',
        },
      });
      expect(result).toEqual(updatedProfile);
    });

    it('should throw BadRequestException when duplicate name exists', async () => {
      const updateDto = { firstName: 'Jane', lastName: 'Smith' };

      mockPrismaService.staffProfile.findFirst.mockResolvedValue({
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      await expect(service.update(1, updateDto)).rejects.toThrow(
        new BadRequestException('Un autre profil staff "Jane Smith" existe déjà.')
      );

      expect(mockPrismaService.staffProfile.update).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const updateDto = { phone: '0987654321' };

      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.staffProfile.update.mockResolvedValue({
        ...existingProfile,
        phone: '0987654321',
      });

      await service.update(1, updateDto);

      expect(mockPrismaService.staffProfile.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { phone: '0987654321' },
      });
    });

    it('should handle birthDate string conversion', async () => {
      const updateDto = { birthDate: '1985-05-15' };

      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.staffProfile.update.mockResolvedValue({
        ...existingProfile,
        birthDate: new Date('1985-05-15'),
      });

      await service.update(1, updateDto);

      expect(mockPrismaService.staffProfile.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { birthDate: new Date('1985-05-15') },
      });
    });

    it('should handle discipline updates', async () => {
      const updateDto = { discipline: Discipline.PSYCHOLOGIST };

      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.staffProfile.update.mockResolvedValue({
        ...existingProfile,
        discipline: Discipline.PSYCHOLOGIST,
      });

      await service.update(1, updateDto);

      expect(mockPrismaService.staffProfile.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { discipline: Discipline.PSYCHOLOGIST },
      });
    });
  });

  describe('remove', () => {
    it('should remove staff profile successfully', async () => {
      mockPrismaService.staffProfile.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove(1);

      expect(mockPrismaService.staffProfile.deleteMany).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1 });
    });

    it('should throw NotFoundException when staff profile not found', async () => {
      mockPrismaService.staffProfile.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Staff 999 introuvable')
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty specialty', async () => {
      const createDto = {
        email: 'staff@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '0123456789',
        discipline: Discipline.EDUCATOR,
        birthDate: '1990-01-01',
        specialty: '',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue({ id: 'user-id' }) },
          staffProfile: { create: jest.fn().mockResolvedValue({ id: 1, specialty: '' }) },
        });
      });

      const result = await service.create(createDto);
      expect(result.specialty).toBe('');
    });

    it('should handle Unicode characters in names', async () => {
      const createDto = {
        email: 'staff@example.com',
        password: 'Password123!',
        firstName: 'José',
        lastName: 'González',
        phone: '0123456789',
        discipline: Discipline.EDUCATOR,
        birthDate: '1990-01-01',
        specialty: 'Éducation spécialisée',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue({ id: 'user-id' }) },
          staffProfile: { 
            create: jest.fn().mockResolvedValue({ 
              id: 1, 
              firstName: 'José', 
              lastName: 'González',
              specialty: 'Éducation spécialisée'
            }) 
          },
        });
      });

      const result = await service.create(createDto);
      expect(result.firstName).toBe('José');
      expect(result.lastName).toBe('González');
      expect(result.specialty).toBe('Éducation spécialisée');
    });

    it('should handle future birth dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const updateDto = { birthDate: futureDate.toISOString().split('T')[0] };

      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
      } as any);

      mockPrismaService.staffProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.staffProfile.update.mockResolvedValue({
        id: 1,
        birthDate: futureDate,
      });

      const result = await service.update(1, updateDto);
      expect(result.birthDate).toEqual(futureDate);
    });
  });
}); 