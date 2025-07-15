import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CoursModule } from '../src/cours/cours.module';
import { CoursService } from '../src/cours/cours.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CsrfGuard } from '../src/common/guards/csrf.guard';
import { ValidationPipe } from '@nestjs/common';

describe('Cours E2E (Child Focus)', () => {
  let app: INestApplication;
  let coursService: CoursService;

  // Mock simple pour PrismaService
  const mockPrisma = {
    child: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        firstName: 'TestChild',
        lastName: 'Test',
      }),
    },
  };

  // Mock simple pour les Guards (pas d'auth)
  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoursModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    coursService = moduleFixture.get<CoursService>(CoursService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Child Courses API', () => {
    const childId = 1;

    it('GET /cours/child/:childId/matieres - should return available subjects', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);
      
      const matieres = response.body;
      expect(matieres[0]).toMatchObject({
        id: 'francais',
        title: 'Français',
        description: 'Lecture, écriture et expression',
        available: true,
      });

      expect(matieres[1]).toMatchObject({
        id: 'math',
        title: 'Mathématiques',
        description: 'Nombres, calculs et logique',
        available: true,
      });

      expect(matieres[2]).toMatchObject({
        id: 'communication',
        title: 'Communication',
        description: 'Pictogrammes et expression',
        available: true,
      });
    });

    it('GET /cours/child/:childId/matiere/francais - should return French subject details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/francais`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'francais',
        title: 'Français',
        description: 'Lecture, écriture et expression',
        icon: 'menu_book',
        estimatedDuration: 8,
        steps: ['introduction', 'regle', 'exercices', 'production', 'verification', 'synthese'],
        available: true,
      });
    });

    it('GET /cours/child/:childId/matiere/math - should return Math subject details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/math`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'math',
        title: 'Mathématiques',
        steps: ['introduction', 'expression', 'resolution', 'exercices', 'probleme', 'synthese'],
        estimatedDuration: 12,
      });
    });

    it('GET /cours/child/:childId/progress/francais - should return initial progress', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/francais`)
        .expect(200);

      expect(response.body).toMatchObject({
        childId: childId,
        matiere: 'francais',
        currentStep: 'introduction',
        progressPercent: 0,
        data: {},
      });
    });

    it('POST /cours/progress - should save child progress', async () => {
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'regle',
        progressPercent: 33,
        data: { completedIntroduction: true },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      expect(response.body).toMatchObject(progressData);
    });

    it('PUT /cours/child/:childId/progress/francais - should update progress', async () => {
      const updateData = {
        currentStep: 'exercices',
        progressPercent: 66,
        data: { score: 85 },
      };

      const response = await request(app.getHttpServer())
        .put(`/cours/child/${childId}/progress/francais`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        childId: childId,
        matiere: 'francais',
        currentStep: 'exercices',
        progressPercent: 66,
        data: { score: 85 },
      });
    });

    it('POST /cours/child/:childId/complete/communication - should complete course', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/communication`)
        .expect(201);

      expect(response.body).toMatchObject({
        childId: childId,
        matiere: 'communication',
        currentStep: 'synthese',
        progressPercent: 100,
      });
      expect(response.body.completedAt).toBeDefined();
    });

    it('GET /cours/child/:childId/stats - should return child statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCours: 3,
        coursCompleted: 0,
        averageProgress: 0,
      });
      expect(response.body.lastActivity).toBeDefined();
    });

    it('should handle invalid child ID gracefully', async () => {
      const invalidChildId = 999;

      // Mock Prisma to return null for invalid child
      mockPrisma.child.findUnique.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get(`/cours/child/${invalidChildId}/matieres`)
        .expect(404);
    });

    it('should handle invalid subject gracefully', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/invalid_subject`)
        .expect(404);
    });
  });

  describe('Child Learning Workflow', () => {
    const childId = 1;

    it('should complete full learning progression', async () => {
      // 1. Get available subjects
      const subjectsResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .expect(200);

      expect(subjectsResponse.body).toHaveLength(3);

      // 2. Start with French
      const frenchResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/francais`)
        .expect(200);

      expect(frenchResponse.body.steps).toHaveLength(6);

      // 3. Progress through steps
      const steps = frenchResponse.body.steps;
      for (let i = 0; i < steps.length - 1; i++) {
        const progressData = {
          childId: childId,
          matiere: 'francais',
          currentStep: steps[i],
          progressPercent: Math.round(((i + 1) / steps.length) * 100),
          data: { step: steps[i], completed: true },
        };

        await request(app.getHttpServer())
          .post('/cours/progress')
          .send(progressData)
          .expect(201);
      }

      // 4. Complete the course
      const completionResponse = await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/francais`)
        .expect(201);

      expect(completionResponse.body.progressPercent).toBe(100);
      expect(completionResponse.body.completedAt).toBeDefined();

      // 5. Check final stats
      const statsResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      expect(statsResponse.body.totalCours).toBe(3);
    });
  });
}); 