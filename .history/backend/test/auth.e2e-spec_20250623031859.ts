import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.user.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.passwordReset.deleteMany();
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          emailVerified: true,
          role: Role.PARENT,
        },
      });
    });

    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe('test@example.com');
          expect(res.body.csrf_token).toBeDefined();
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    it('should fail login with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('should fail login with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail login with unverified email', async () => {
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { emailVerified: false },
      });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);
    });
  });

  describe('/auth/register-by-invite (POST)', () => {
    let invitation: any;

    beforeEach(async () => {
      // Create admin user for invitation
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          emailVerified: true,
          role: Role.ADMIN,
        },
      });

      // Create invitation
      invitation = await prisma.invitation.create({
        data: {
          email: 'newuser@example.com',
          token: 'valid-invitation-token',
          roleToAssign: Role.SECRETARY,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          invitedBy: adminUser.id,
        },
      });
    });

    it('should register successfully with valid invitation', () => {
      return request(app.getHttpServer())
        .post('/auth/register-by-invite')
        .send({
          token: 'valid-invitation-token',
          email: 'newuser@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('Inscription réussie');
        });
    });

    it('should fail with invalid invitation token', () => {
      return request(app.getHttpServer())
        .post('/auth/register-by-invite')
        .send({
          token: 'invalid-token',
          email: 'newuser@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);
    });

    it('should fail with email mismatch', () => {
      return request(app.getHttpServer())
        .post('/auth/register-by-invite')
        .send({
          token: 'valid-invitation-token',
          email: 'different@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('adresse e-mail ne correspond pas');
        });
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register-by-invite')
        .send({
          token: 'valid-invitation-token',
          email: 'newuser@example.com',
          password: 'weak',
          confirmPassword: 'weak',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);
    });

    it('should fail with password mismatch', () => {
      return request(app.getHttpServer())
        .post('/auth/register-by-invite')
        .send({
          token: 'valid-invitation-token',
          email: 'newuser@example.com',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);
    });

    it('should mark invitation as used after successful registration', async () => {
      await request(app.getHttpServer())
        .post('/auth/register-by-invite')
        .send({
          token: 'valid-invitation-token',
          email: 'newuser@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      const updatedInvitation = await prisma.invitation.findUnique({
        where: { token: 'valid-invitation-token' },
      });

      expect(updatedInvitation.used).toBe(true);
    });
  });

  describe('/auth/forgot-password (POST)', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          emailVerified: true,
          role: Role.PARENT,
        },
      });
    });

    it('should initiate password reset for existing user', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should handle non-existent email gracefully', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(201); // Should still return 201 for security
    });

    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should create password reset record', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        })
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
        include: { passwordResets: true },
      });

      expect(user.passwordResets).toHaveLength(1);
      expect(user.passwordResets[0].token).toBeDefined();
      expect(user.passwordResets[0].expiresAt).toBeDefined();
    });
  });

  describe('/auth/reset-password (POST)', () => {
    let user: any;
    let passwordReset: any;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          emailVerified: true,
          role: Role.PARENT,
        },
      });

      passwordReset = await prisma.passwordReset.create({
        data: {
          token: 'valid-reset-token',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          userId: user.id,
        },
      });
    });

    it('should reset password successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          prid: passwordReset.id.toString(),
          token: 'valid-reset-token',
          newPassword: 'NewPassword123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          prid: passwordReset.id.toString(),
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
        .expect(400);
    });

    it('should fail with expired token', async () => {
      await prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour ago
      });

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          prid: passwordReset.id.toString(),
          token: 'valid-reset-token',
          newPassword: 'NewPassword123!',
        })
        .expect(400);
    });

    it('should validate new password strength', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          prid: passwordReset.id.toString(),
          token: 'valid-reset-token',
          newPassword: 'weak',
        })
        .expect(400);
    });

    it('should update user password after successful reset', async () => {
      const oldUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          prid: passwordReset.id.toString(),
          token: 'valid-reset-token',
          newPassword: 'NewPassword123!',
        })
        .expect(201);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser.password).not.toBe(oldUser.password);
      expect(updatedUser.passwordChangedAt).not.toEqual(oldUser.passwordChangedAt);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let user: any;
    let refreshToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          emailVerified: true,
          role: Role.PARENT,
          refreshToken: 'valid-refresh-token',
        },
      });
      refreshToken = 'valid-refresh-token';
    });

    it('should refresh token successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=test-csrf'])
        .send()
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.csrf_token).toBeDefined();
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    it('should fail without refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send()
        .expect(401);
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid-token', 'csrf_token=test-csrf'])
        .send()
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    let user: any;
    let refreshToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          emailVerified: true,
          role: Role.PARENT,
          refreshToken: 'valid-refresh-token',
        },
      });
      refreshToken = 'valid-refresh-token';
    });

    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=test-csrf'])
        .send()
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('Logout successful');
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    it('should clear refresh token from database', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=test-csrf'])
        .send()
        .expect(201);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser.refreshToken).toBeNull();
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow', async () => {
      // 1. Create invitation
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          emailVerified: true,
          role: Role.ADMIN,
        },
      });

      await prisma.invitation.create({
        data: {
          email: 'newuser@example.com',
          token: 'invitation-token',
          roleToAssign: Role.SECRETARY,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          invitedBy: adminUser.id,
        },
      });

      // 2. Register by invitation
      await request(app.getHttpServer())
        .post('/auth/register-by-invite')
        .send({
          token: 'invitation-token',
          email: 'newuser@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      // 3. Login with new account
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
        })
        .expect(201);

      expect(loginResponse.body.access_token).toBeDefined();
      expect(loginResponse.body.user.role).toBe(Role.SECRETARY);

      // 4. Use refresh token
      const cookies = loginResponse.headers['set-cookie'];
      const refreshCookie = cookies.find(cookie => cookie.startsWith('refresh_token='));
      const csrfCookie = cookies.find(cookie => cookie.startsWith('csrf_token='));

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie, csrfCookie])
        .send()
        .expect(201);

      // 5. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [refreshCookie, csrfCookie])
        .send()
        .expect(201);
    });
  });
}); 