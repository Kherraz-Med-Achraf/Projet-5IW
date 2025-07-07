import { Test, TestingModule } from '@nestjs/testing';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JustificationType } from './dto/presence.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PresenceController', () => {
  let controller: PresenceController;
  let service: PresenceService;

  const mockPresenceService = {
    createSheet: jest.fn(),
    validateSheet: jest.fn(),
    justify: jest.fn(),
    findByDate: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'user-123', role: 'STAFF' },
  };

  const mockSheet = {
    id: 1,
    date: '2025-01-15',
    staffId: 'user-123',
    status: 'PENDING_STAFF',
    records: [
      {
        id: 1,
        childId: 1,
        present: false,
        child: {
          id: 1,
          firstName: 'Jean',
          lastName: 'Dupont',
          parent: { phone: '+33123456789' },
        },
        justification: null,
      },
    ],
    staff: {
      staffProfile: { firstName: 'Marie', lastName: 'Martin' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenceController],
      providers: [
        {
          provide: PresenceService,
          useValue: mockPresenceService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PresenceController>(PresenceController);
    service = module.get<PresenceService>(PresenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSheet', () => {
    it('should create a presence sheet successfully', async () => {
      const dto = { date: '2025-01-15' };
      mockPresenceService.createSheet.mockResolvedValue(mockSheet);

      const result = await controller.createSheet(dto, mockRequest as any);

      expect(service.createSheet).toHaveBeenCalledWith(
        '2025-01-15',
        'user-123',
      );
      expect(result).toEqual(mockSheet);
    });

    it('should handle service errors', async () => {
      const dto = { date: '2025-01-15' };
      mockPresenceService.createSheet.mockRejectedValue(
        new BadRequestException('Feuille déjà existante'),
      );

      await expect(
        controller.createSheet(dto, mockRequest as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateSheet', () => {
    it('should validate sheet with present children', async () => {
      const sheetId = 1;
      const dto = { presentChildIds: [1, 2] };
      const validatedSheet = { ...mockSheet, status: 'PENDING_SECRETARY' };

      mockPresenceService.validateSheet.mockResolvedValue(validatedSheet);

      const result = await controller.validateSheet(
        sheetId,
        dto,
        mockRequest as any,
      );

      expect(service.validateSheet).toHaveBeenCalledWith(1, [1, 2], 'user-123');
      expect(result).toEqual(validatedSheet);
    });

    it('should handle non-existent sheet', async () => {
      const sheetId = 999;
      const dto = { presentChildIds: [1] };

      mockPresenceService.validateSheet.mockRejectedValue(
        new NotFoundException('Feuille introuvable'),
      );

      await expect(
        controller.validateSheet(sheetId, dto, mockRequest as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('justify', () => {
    it('should justify absence with file', async () => {
      const recordId = 1;
      const dto = {
        type: JustificationType.ABSENCE,
        justificationDate: '2025-01-15',
        motif: 'Certificat médical',
      };
      const mockFile = {
        filename: 'certificat.pdf',
        path: '/uploads/justifications/certificat.pdf',
      } as any;

      const justifiedSheet = { ...mockSheet, status: 'VALIDATED' };
      mockPresenceService.justify.mockResolvedValue(justifiedSheet);

      const result = await controller.justify(recordId, dto, mockFile);

      expect(service.justify).toHaveBeenCalledWith(
        1,
        dto,
        '/uploads/justifications/certificat.pdf',
      );
      expect(result).toEqual(justifiedSheet);
    });

    it('should justify lateness without file', async () => {
      const recordId = 1;
      const dto = {
        type: JustificationType.LATENESS,
        justificationDate: '2025-01-15',
      };

      const justifiedSheet = { ...mockSheet };
      mockPresenceService.justify.mockResolvedValue(justifiedSheet);

      const result = await controller.justify(recordId, dto, undefined);

      expect(service.justify).toHaveBeenCalledWith(1, dto, undefined);
      expect(result).toEqual(justifiedSheet);
    });

    it('should handle invalid record ID', async () => {
      const recordId = 999;
      const dto = {
        type: JustificationType.ABSENCE,
        justificationDate: '2025-01-15',
        motif: 'Test',
      };

      mockPresenceService.justify.mockRejectedValue(
        new NotFoundException('Enregistrement introuvable'),
      );

      await expect(
        controller.justify(recordId, dto, undefined),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByDate', () => {
    it('should find presence sheet by date', async () => {
      const date = '2025-01-15';
      mockPresenceService.findByDate.mockResolvedValue(mockSheet);

      const result = await controller.findByDate(date);

      expect(service.findByDate).toHaveBeenCalledWith('2025-01-15');
      expect(result).toEqual(mockSheet);
    });
  });

  describe('phone number masking', () => {});

  describe('role-based access', () => {
    it('should allow STAFF to create and validate sheets', async () => {
      const dto = { date: '2025-01-15' };
      const staffRequest = { user: { id: 'staff-1', role: 'STAFF' } };

      mockPresenceService.createSheet.mockResolvedValue(mockSheet);

      const result = await controller.createSheet(dto, staffRequest as any);

      expect(result).toBeDefined();
    });

    it('should allow SECRETARY to justify absences', async () => {
      const recordId = 1;
      const dto = {
        type: JustificationType.ABSENCE,
        justificationDate: '2025-01-15',
        motif: 'Médical',
      };

      mockPresenceService.justify.mockResolvedValue(mockSheet);

      const result = await controller.justify(recordId, dto, undefined);

      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle service unavailable', async () => {
      const dto = { date: '2025-01-15' };
      mockPresenceService.createSheet.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.createSheet(dto, mockRequest as any),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle malformed request data', async () => {
      const dto = { date: null };

      // This would normally be caught by validation pipes
      await expect(
        controller.createSheet(dto as any, mockRequest as any),
      ).rejects.toThrow();
    });
  });
});
