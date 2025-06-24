import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotFoundException } from '@nestjs/common';
import { Role, Discipline } from '@prisma/client';

describe('StaffController', () => {
  let controller: StaffController;
  let service: jest.Mocked<StaffService>;

  const mockStaffService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        { provide: StaffService, useValue: mockStaffService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<StaffController>(StaffController);
    service = module.get(StaffService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a staff member', async () => {
      const createDto = {
        email: 'staff@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '0123456789',
        discipline: Discipline.EDUCATOR,
        birthDate: '1990-01-01',
        specialty: 'Special Education',
      };

      const expectedResult = {
        id: 1,
        userId: 'user-id',
        ...createDto,
        user: { id: 'user-id', email: createDto.email, role: Role.STAFF },
      };

      mockStaffService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all staff members', async () => {
      const mockStaff = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' },
      ];

      mockStaffService.findAll.mockResolvedValue(mockStaff);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockStaff);
    });
  });

  describe('findOne', () => {
    const mockProfile = {
      id: 1,
      userId: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should return staff profile for authorized user', async () => {
      const user = { id: 'user-admin', role: Role.SERVICE_MANAGER };

      mockStaffService.findOne.mockResolvedValue(mockProfile);

      const result = await controller.findOne(user, 1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProfile);
    });

    it('should return own profile for staff user', async () => {
      const user = { id: 'user-1', role: Role.STAFF };
      const profileWithMatchingUserId = { ...mockProfile, userId: 'user-1' };

      mockStaffService.findOne.mockResolvedValue(profileWithMatchingUserId);

      const result = await controller.findOne(user, 1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(profileWithMatchingUserId);
    });

    it('should throw NotFoundException when staff tries to access other profile', async () => {
      const user = { id: 'user-2', role: Role.STAFF };

      mockStaffService.findOne.mockResolvedValue(mockProfile);

      await expect(controller.findOne(user, 1)).rejects.toThrow(
        new NotFoundException('Profil staff introuvable')
      );
    });
  });

  describe('update', () => {
    const mockProfile = {
      id: 1,
      userId: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
    };

    const updateDto = {
      firstName: 'Jane',
      specialty: 'Advanced Education',
    };

    it('should update staff profile for authorized user', async () => {
      const user = { id: 'user-admin', role: Role.SERVICE_MANAGER };
      const updatedProfile = { ...mockProfile, ...updateDto };

      mockStaffService.findOne.mockResolvedValue(mockProfile);
      mockStaffService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update(user, 1, updateDto);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(updatedProfile);
    });

    it('should allow staff to update own profile', async () => {
      const user = { id: 'user-1', role: Role.STAFF };
      const profileWithMatchingUserId = { ...mockProfile, userId: 'user-1' };
      const updatedProfile = { ...profileWithMatchingUserId, ...updateDto };

      mockStaffService.findOne.mockResolvedValue(profileWithMatchingUserId);
      mockStaffService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update(user, 1, updateDto);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(updatedProfile);
    });

    it('should throw NotFoundException when staff tries to update other profile', async () => {
      const user = { id: 'user-2', role: Role.STAFF };

      mockStaffService.findOne.mockResolvedValue(mockProfile);

      await expect(controller.update(user, 1, updateDto)).rejects.toThrow(
        new NotFoundException('Profil staff introuvable')
      );

      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove staff profile', async () => {
      const expectedResult = { id: 1 };

      mockStaffService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });
  });


}); 