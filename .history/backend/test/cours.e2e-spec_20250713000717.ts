import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

describe('Cours (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tokens
  let childToken: string;
  let parentToken: string;
  let staffToken: string;
  let adminToken: string;

  // Test data
  let childId: number;
  let parentId: string;
  let staffId: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();

    // Nettoyer la base de données
    await cleanDatabase();

    // Créer les utilisateurs de test
    await createTestUsers();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  async function cleanDatabase() {
    // Nettoyer dans l'ordre correct pour respecter les contraintes
    await prisma.child.deleteMany();
    await prisma.parentProfile.deleteMany();
    await prisma.staffProfile.deleteMany();
    await prisma.user.deleteMany();
  }

  async function createTestUsers() {
    // Créer un admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: 'hashedpassword',
        role: Role.ADMIN,
        isEmailVerified: true,
      },
    });
    adminId = admin.id;
    adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: admin.role });

    // Créer un staff
    const staff = await prisma.user.create({
      data: {
        email: 'staff@test.com',
        password: 'hashedpassword',
        role: Role.STAFF,
        isEmailVerified: true,
        staffProfile: {
          create: {
            firstName: 'Jean',
            lastName: 'Dupont',
            phone: '+33123456789',
          },
        },
      },
    });
    staffId = staff.id;
    staffToken = jwtService.sign({ sub: staff.id, email: staff.email, role: staff.role });

    // Créer un parent
    const parent = await prisma.user.create({
      data: {
        email: 'parent@test.com',
        password: 'hashedpassword',
        role: Role.PARENT,
        isEmailVerified: true,
        parentProfile: {
          create: {
            firstName: 'Marie',
            lastName: 'Martin',
            phone: '+33123456789',
            address: '123 rue Test',
            legalResponsibility: 'Mère',
          },
        },
      },
    });
    parentId = parent.id;
    parentToken = jwtService.sign({ sub: parent.id, email: parent.email, role: parent.role });

    // Créer un enfant lié au parent
    const child = await prisma.child.create({
      data: {
        firstName: 'Lucas',
        lastName: 'Martin',
        birthDate: new Date('2015-05-15'),
        parentId: parseInt(parentId),
        user: {
          create: {
            email: 'lucas@test.com',
            password: 'hashedpassword',
            role: Role.CHILD,
            isEmailVerified: true,
          },
        },
      },
      include: {
        user: true,
      },
    });
    childId = child.id;
    childToken = jwtService.sign({ 
      sub: child.user.id, 
      email: child.user.email, 
      role: child.user.role 
    });
  }

  describe('GET /cours/child/:childId/matieres', () => {
    it('should return all available subjects for a child', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);
      
      const matieres = response.body;
      expect(matieres[0]).toMatchObject({
        id: 'francais',
        title: 'Français',
        description: 'Lecture, écriture et expression',
        icon: 'menu_book',
        estimatedDuration: 8,
        available: true,
      });

      expect(matieres[1]).toMatchObject({
        id: 'math',
        title: 'Mathématiques',
        description: 'Nombres, calculs et logique',
        icon: 'calculate',
        estimatedDuration: 12,
        available: true,
      });

      expect(matieres[2]).toMatchObject({
        id: 'communication',
        title: 'Communication',
        description: 'Pictogrammes et expression',
        icon: 'chat',
        estimatedDuration: 8,
        available: true,
      });
    });

    it('should allow parent to access child subjects', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('should allow staff to access child subjects', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent child', async () => {
      await request(app.getHttpServer())
        .get('/cours/child/999999/matieres')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .expect(401);
    });
  });

  describe('GET /cours/child/:childId/matiere/:matiereId', () => {
    it('should return specific subject details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/francais`)
        .set('Authorization', `Bearer ${childToken}`)
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

    it('should return math subject details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/math`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'math',
        title: 'Mathématiques',
        steps: ['introduction', 'expression', 'resolution', 'exercices', 'probleme', 'synthese'],
      });
    });

    it('should return communication subject details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/communication`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'communication',
        title: 'Communication',
        steps: ['introduction', 'pictogrammes', 'sequence', 'activite', 'creation', 'conclusion'],
      });
    });

    it('should return 404 for non-existent subject', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/invalid`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(404);
    });
  });

  describe('GET /cours/child/:childId/progress/:matiere', () => {
    it('should return initial progress for a subject', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/francais`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        childId: childId,
        matiere: 'francais',
        currentStep: 'introduction',
        progressPercent: 0,
        data: {},
      });
    });

    it('should allow parent to view child progress', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/math`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('should allow staff to view child progress', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/communication`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });

  describe('POST /cours/progress', () => {
    it('should save child progress', async () => {
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'regle',
        progressPercent: 33,
        data: { completedIntroduction: true },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .set('Authorization', `Bearer ${childToken}`)
        .send(progressData)
        .expect(201);

      expect(response.body).toMatchObject(progressData);
    });

    it('should allow staff to save child progress', async () => {
      const progressData = {
        childId: childId,
        matiere: 'math',
        currentStep: 'expression',
        progressPercent: 25,
        data: { tutorialViewed: true },
      };

      await request(app.getHttpServer())
        .post('/cours/progress')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(progressData)
        .expect(201);
    });

    it('should reject invalid step', async () => {
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'invalid_step',
        progressPercent: 50,
      };

      await request(app.getHttpServer())
        .post('/cours/progress')
        .set('Authorization', `Bearer ${childToken}`)
        .send(progressData)
        .expect(404);
    });

    it('should reject invalid matiere', async () => {
      const progressData = {
        childId: childId,
        matiere: 'invalid_matiere',
        currentStep: 'introduction',
        progressPercent: 0,
      };

      await request(app.getHttpServer())
        .post('/cours/progress')
        .set('Authorization', `Bearer ${childToken}`)
        .send(progressData)
        .expect(404);
    });

    it('should reject access for parent role', async () => {
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'regle',
        progressPercent: 33,
      };

      await request(app.getHttpServer())
        .post('/cours/progress')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(progressData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/cours/progress')
        .set('Authorization', `Bearer ${childToken}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/cours/progress')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ childId: childId })
        .expect(400);
    });
  });

  describe('PUT /cours/child/:childId/progress/:matiere', () => {
    it('should update child progress', async () => {
      const progressData = {
        currentStep: 'exercices',
        progressPercent: 66,
        data: { score: 85 },
      };

      const response = await request(app.getHttpServer())
        .put(`/cours/child/${childId}/progress/francais`)
        .set('Authorization', `Bearer ${childToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body).toMatchObject({
        childId: childId,
        matiere: 'francais',
        currentStep: 'exercices',
        progressPercent: 66,
        data: { score: 85 },
      });
    });

    it('should allow partial updates', async () => {
      const progressData = {
        progressPercent: 75,
      };

      const response = await request(app.getHttpServer())
        .put(`/cours/child/${childId}/progress/math`)
        .set('Authorization', `Bearer ${childToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body.progressPercent).toBe(75);
      expect(response.body.currentStep).toBe('introduction'); // default value
    });
  });

  describe('POST /cours/child/:childId/complete/:matiere', () => {
    it('should mark course as completed', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/communication`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        childId: childId,
        matiere: 'communication',
        currentStep: 'synthese',
        progressPercent: 100,
      });
      expect(response.body.completedAt).toBeDefined();
    });

    it('should allow staff to mark course as completed', async () => {
      await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/francais`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(201);
    });

    it('should reject access for parent role', async () => {
      await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/math`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });
  });

  describe('GET /cours/child/:childId/stats', () => {
    it('should return child statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCours: 3,
        coursCompleted: 0,
        averageProgress: 0,
      });
      expect(response.body.lastActivity).toBeDefined();
    });

    it('should allow parent to view child stats', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('should allow staff to view child stats', async () => {
      await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });

  describe('GET /cours/health', () => {
    it('should return health status for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/cours/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'cours',
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should reject access for non-admin roles', async () => {
      await request(app.getHttpServer())
        .get('/cours/health')
        .set('Authorization', `Bearer ${childToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/cours/health')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });
  });

  describe('Integration workflow', () => {
    it('should complete full course progression workflow', async () => {
      const childId2 = childId;
      
      // 1. Get available subjects
      const subjectsResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId2}/matieres`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(subjectsResponse.body).toHaveLength(3);

      // 2. Get initial progress
      const initialProgress = await request(app.getHttpServer())
        .get(`/cours/child/${childId2}/progress/francais`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(initialProgress.body.progressPercent).toBe(0);

      // 3. Progress through steps
      const steps = ['introduction', 'regle', 'exercices', 'production', 'verification'];
      for (let i = 0; i < steps.length; i++) {
        const progressData = {
          childId: childId2,
          matiere: 'francais',
          currentStep: steps[i],
          progressPercent: ((i + 1) / 6) * 100, // 6 total steps
          data: { step: steps[i], completed: true },
        };

        await request(app.getHttpServer())
          .post('/cours/progress')
          .set('Authorization', `Bearer ${childToken}`)
          .send(progressData)
          .expect(201);
      }

      // 4. Complete the course
      const completionResponse = await request(app.getHttpServer())
        .post(`/cours/child/${childId2}/complete/francais`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(201);

      expect(completionResponse.body.progressPercent).toBe(100);
      expect(completionResponse.body.completedAt).toBeDefined();

      // 5. Check final stats
      const statsResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId2}/stats`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(statsResponse.body.totalCours).toBe(3);
    });
  });
}); 