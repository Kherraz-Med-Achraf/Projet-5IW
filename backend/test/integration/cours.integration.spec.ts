import { Test, TestingModule } from '@nestjs/testing';
import { CoursService, CoursProgress } from '../../src/cours/cours.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CoursService Integration', () => {
  let service: CoursService;
  let prisma: PrismaService;

  // Mock Prisma simple
  const mockPrisma = {
    child: {
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CoursService>(CoursService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integration: Service + Validation', () => {
    it('should get matieres for valid child', async () => {
      // Mock child exists
      mockPrisma.child.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Test',
        lastName: 'Child',
      });

      const result = await service.getMatieres(1);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 'francais',
        title: 'Français',
        available: true,
      });
      expect(prisma.child.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException for invalid child', async () => {
      // Mock child doesn't exist
      mockPrisma.child.findUnique.mockResolvedValue(null);

      await expect(service.getMatieres(999)).rejects.toThrow(NotFoundException);
      expect(prisma.child.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should validate and save progress correctly', async () => {
      // Mock child exists
      mockPrisma.child.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Test',
        lastName: 'Child',
      });

      const progress: CoursProgress = {
        childId: 1,
        matiere: 'francais',
        currentStep: 'regle',
        progressPercent: 50,
        data: { completed: true },
      };

      const result = await service.saveProgress(progress);

      expect(result).toMatchObject(progress);
      expect(result.data).toEqual({ completed: true });
    });

    it('should reject invalid step in progress', async () => {
      // Mock child exists
      mockPrisma.child.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Test',
        lastName: 'Child',
      });

      const invalidProgress: CoursProgress = {
        childId: 1,
        matiere: 'francais',
        currentStep: 'invalid_step',
        progressPercent: 50,
      };

      await expect(service.saveProgress(invalidProgress)).rejects.toThrow(NotFoundException);
    });

    it('should complete course workflow', async () => {
      // Mock child exists
      mockPrisma.child.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Test',
        lastName: 'Child',
      });

      const result = await service.completeCours(1, 'math');

      expect(result.progressPercent).toBe(100);
      expect(result.currentStep).toBe('synthese');
      expect(result.completedAt).toBeDefined();
    });
  });

  describe('Integration: Cross-validation between methods', () => {
    it('should validate matiere exists before saving progress', async () => {
      // Mock child exists
      mockPrisma.child.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Test',
        lastName: 'Child',
      });

      const invalidProgress: CoursProgress = {
        childId: 1,
        matiere: 'invalid_matiere',
        currentStep: 'introduction',
        progressPercent: 0,
      };

      await expect(service.saveProgress(invalidProgress)).rejects.toThrow(NotFoundException);
    });

    it('should handle child stats calculation', async () => {
      // Mock child exists
      mockPrisma.child.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Test',
        lastName: 'Child',
      });

      const stats = await service.getChildStats(1);

      expect(stats).toMatchObject({
        totalCours: 3,
        coursCompleted: 0,
        averageProgress: 0,
      });
      expect(stats.lastActivity).toBeDefined();
    });
  });
}); 