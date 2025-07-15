import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

describe('Planning (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tokens
  let directorToken: string;
  let serviceManagerToken: string;
  let staffToken: string;
  let parentToken: string;

  // Test data
  let directorId: string;
  let serviceManagerId: string;
  let staffId: string;
  let parentId: string;
  let childId: number;
  let semesterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Clean database
    await prisma.entryChild.deleteMany();
    await prisma.scheduleEntry.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.child.deleteMany();
    await prisma.parentProfile.deleteMany();
    await prisma.staffProfile.deleteMany();
    await prisma.directorProfile.deleteMany();
    await prisma.serviceManagerProfile.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const director = await prisma.user.create({
      data: {
        email: 'director@test.com',
        password: 'hashedpassword',
        emailVerified: true,
        role: Role.DIRECTOR,
        directorProfile: {
          create: {
            firstName: 'Jean',
            lastName: 'Martin',
            jobTitle: 'Directeur',
            startDate: new Date(),
            birthDate: new Date('1970-01-01'),
            phone: '0123456789',
          },
        },
      },
    });

    const serviceManager = await prisma.user.create({
      data: {
        email: 'servicemanager@test.com',
        password: 'hashedpassword',
        emailVerified: true,
        role: Role.SERVICE_MANAGER,
        serviceManagerProfile: {
          create: {
            firstName: 'Sophie',
            lastName: 'Leroy',
            jobTitle: 'Chef de service',
            startDate: new Date(),
            birthDate: new Date('1975-01-01'),
            phone: '0123456790',
          },
        },
      },
    });

    const staff = await prisma.user.create({
      data: {
        email: 'staff@test.com',
        password: 'hashedpassword',
        emailVerified: true,
        role: Role.STAFF,
        staffProfile: {
          create: {
            firstName: 'Alice',
            lastName: 'Bernard',
            birthDate: new Date('1980-01-01'),
            phone: '0123456791',
            discipline: 'EDUCATOR',
          },
        },
      },
    });

    const parent = await prisma.user.create({
      data: {
        email: 'parent@test.com',
        password: 'hashedpassword',
        emailVerified: true,
        role: Role.PARENT,
        parentProfile: {
          create: {
            firstName: 'Pierre',
            lastName: 'Durand',
            phone: '0123456792',
            address: '123 rue Test',
            legalResponsibility: 'Tuteur',
          },
        },
      },
    });

    // Create child
    const child = await prisma.child.create({
      data: {
        firstName: 'Emma',
        lastName: 'Durand',
        birthDate: new Date('2010-01-01'),
        parentProfileId: (await prisma.parentProfile.findUnique({ where: { userId: parent.id } }))!.id,
      },
    });

    directorId = director.id;
    serviceManagerId = serviceManager.id;
    staffId = staff.id;
    parentId = parent.id;
    childId = child.id;

    // Generate JWT tokens
    directorToken = jwtService.sign({
      sub: directorId,
      email: director.email,
      role: Role.DIRECTOR,
    });
    serviceManagerToken = jwtService.sign({
      sub: serviceManagerId,
      email: serviceManager.email,
      role: Role.SERVICE_MANAGER,
    });
    staffToken = jwtService.sign({
      sub: staffId,
      email: staff.email,
      role: Role.STAFF,
    });
    parentToken = jwtService.sign({
      sub: parentId,
      email: parent.email,
      role: Role.PARENT,
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.entryChild.deleteMany();
    await prisma.scheduleEntry.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.child.deleteMany();
    await prisma.parentProfile.deleteMany();
    await prisma.staffProfile.deleteMany();
    await prisma.directorProfile.deleteMany();
    await prisma.serviceManagerProfile.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/planning/semesters (POST) - Create Semester', () => {
    it('should allow director to create semester', async () => {
      const response = await request(app.getHttpServer())
        .post('/planning/semesters')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          name: 'Semestre Test 2024',
          startDate: '2024-09-01',
          endDate: '2025-01-31',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Semestre Test 2024');
      semesterId = response.body.id;
    });

    it('should allow service manager to create semester', async () => {
      const response = await request(app.getHttpServer())
        .post('/planning/semesters')
        .set('Authorization', `Bearer ${serviceManagerToken}`)
        .send({
          name: 'Semestre Test 2024-2',
          startDate: '2024-02-01',
          endDate: '2024-06-30',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Semestre Test 2024-2');
    });

    it('should reject semester creation by staff', async () => {
      await request(app.getHttpServer())
        .post('/planning/semesters')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Semestre Non Autorisé',
          startDate: '2024-09-01',
          endDate: '2025-01-31',
        })
        .expect(403);
    });

    it('should reject semester creation by parent', async () => {
      await request(app.getHttpServer())
        .post('/planning/semesters')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          name: 'Semestre Non Autorisé',
          startDate: '2024-09-01',
          endDate: '2025-01-31',
        })
        .expect(403);
    });

    it('should validate semester data', async () => {
      await request(app.getHttpServer())
        .post('/planning/semesters')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          name: '',
          startDate: 'invalid-date',
          endDate: '2025-01-31',
        })
        .expect(400);
    });
  });

  describe('/planning/semesters (GET) - List Semesters', () => {
    it('should return semesters for director', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/semesters')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should return semesters for staff', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/semesters')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should return semesters for parent', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/semesters')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/planning/semesters')
        .expect(401);
    });
  });

  describe('/planning/semesters/:semesterId/upload (POST) - Upload Excel', () => {
    beforeEach(async () => {
      // Ensure we have a semester
      if (!semesterId) {
        const semester = await prisma.semester.create({
          data: {
            name: 'Test Semester',
            startDate: new Date('2024-09-01'),
            endDate: new Date('2025-01-31'),
          },
        });
        semesterId = semester.id;
      }
    });

    it('should reject upload without file', async () => {
      await request(app.getHttpServer())
        .post(`/planning/semesters/${semesterId}/upload`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(400);
    });

    it('should reject non-Excel files', async () => {
      const testTextPath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testTextPath, 'test content');

      await request(app.getHttpServer())
        .post(`/planning/semesters/${semesterId}/upload`)
        .set('Authorization', `Bearer ${directorToken}`)
        .attach('file', testTextPath)
        .expect(400);

      // Clean up
      if (fs.existsSync(testTextPath)) {
        fs.unlinkSync(testTextPath);
      }
    });

    it('should reject upload by unauthorized user', async () => {
      await request(app.getHttpServer())
        .post(`/planning/semesters/${semesterId}/upload`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });

  describe('/planning/semesters/:semesterId/overview (GET) - Get Overview', () => {
    it('should return overview for director', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/overview`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('entries');
      expect(response.body).toHaveProperty('stats');
    });

    it('should return overview for service manager', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/overview`)
        .set('Authorization', `Bearer ${serviceManagerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('entries');
    });

    it('should reject overview access by staff', async () => {
      await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/overview`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent semester', async () => {
      await request(app.getHttpServer())
        .get('/planning/semesters/non-existent-id/overview')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(404);
    });
  });

  describe('/planning/semesters/:semesterId/staff/:staffId (GET) - Staff Schedule', () => {
    it('should allow staff to view own schedule', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/staff/${staffId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('entries');
      expect(response.body).toHaveProperty('staff');
    });

    it('should allow director to view any staff schedule', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/staff/${staffId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('entries');
    });

    it('should prevent staff from viewing other staff schedules', async () => {
      await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/staff/other-staff-id`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should reject parent access to staff schedules', async () => {
      await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/staff/${staffId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });
  });

  describe('/planning/semesters/:semesterId/child/:childId (GET) - Child Schedule', () => {
    it('should allow parent to view own child schedule', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/child/${childId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('entries');
      expect(response.body).toHaveProperty('child');
    });

    it('should reject staff access to child schedules', async () => {
      await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/child/${childId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should reject director access to child schedules', async () => {
      await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/child/${childId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent child', async () => {
      await request(app.getHttpServer())
        .get(`/planning/semesters/${semesterId}/child/99999`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(404);
    });
  });

  describe('/planning/semesters/:semesterId/submit (POST) - Submit Planning', () => {
    it('should allow director to submit planning', async () => {
      const response = await request(app.getHttpServer())
        .post(`/planning/semesters/${semesterId}/submit`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow service manager to submit planning', async () => {
      const response = await request(app.getHttpServer())
        .post(`/planning/semesters/${semesterId}/submit`)
        .set('Authorization', `Bearer ${serviceManagerToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject planning submission by staff', async () => {
      await request(app.getHttpServer())
        .post(`/planning/semesters/${semesterId}/submit`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent semester', async () => {
      await request(app.getHttpServer())
        .post('/planning/semesters/non-existent-id/submit')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(404);
    });
  });

  describe('Planning Workflow Integration', () => {
    it('should handle complete planning workflow', async () => {
      // 1. Create semester
      const semesterResponse = await request(app.getHttpServer())
        .post('/planning/semesters')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          name: 'Workflow Test Semester',
          startDate: '2024-09-01',
          endDate: '2025-01-31',
        })
        .expect(201);

      const workflowSemesterId = semesterResponse.body.id;

      // 2. Get overview (should be empty initially)
      const overviewResponse = await request(app.getHttpServer())
        .get(`/planning/semesters/${workflowSemesterId}/overview`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(overviewResponse.body.entries).toHaveLength(0);

      // 3. Try to get staff schedule (should be empty)
      const staffScheduleResponse = await request(app.getHttpServer())
        .get(`/planning/semesters/${workflowSemesterId}/staff/${staffId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(staffScheduleResponse.body.entries).toHaveLength(0);

      // 4. Submit planning
      await request(app.getHttpServer())
        .post(`/planning/semesters/${workflowSemesterId}/submit`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(201);
    });

    it('should handle permission workflow correctly', async () => {
      // Test that each role can only access what they're supposed to
      const testSemester = await prisma.semester.create({
        data: {
          name: 'Permission Test Semester',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2025-01-31'),
        },
      });

      // Director can access everything
      await request(app.getHttpServer())
        .get(`/planning/semesters/${testSemester.id}/overview`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/planning/semesters/${testSemester.id}/staff/${staffId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      // Staff can only access own schedule
      await request(app.getHttpServer())
        .get(`/planning/semesters/${testSemester.id}/staff/${staffId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/planning/semesters/${testSemester.id}/overview`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      // Parent can only access child schedule
      await request(app.getHttpServer())
        .get(`/planning/semesters/${testSemester.id}/child/${childId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/planning/semesters/${testSemester.id}/overview`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });
  });
}); 