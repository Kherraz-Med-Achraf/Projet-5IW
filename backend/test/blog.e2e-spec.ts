import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

describe('Blog (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test users
  let secretaryToken: string;
  let directorToken: string;
  let serviceManagerToken: string;
  let parentToken: string;
  let staffToken: string;

  // Test data
  let secretaryId: string;
  let directorId: string;
  let serviceManagerId: string;
  let parentId: string;
  let staffId: string;
  let postId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Clean database
    await prisma.blogReaction.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const secretary = await prisma.user.create({
      data: {
        email: 'secretary@test.com',
        password: 'hashedpassword',
        role: Role.SECRETARY,
        secretaryProfile: {
          create: {
            firstName: 'Marie',
            lastName: 'Dupont',
          },
        },
      },
    });

    const director = await prisma.user.create({
      data: {
        email: 'director@test.com',
        password: 'hashedpassword',
        role: Role.DIRECTOR,
        directorProfile: {
          create: {
            firstName: 'Jean',
            lastName: 'Martin',
          },
        },
      },
    });

    const serviceManager = await prisma.user.create({
      data: {
        email: 'servicemanager@test.com',
        password: 'hashedpassword',
        role: Role.SERVICE_MANAGER,
        serviceManagerProfile: {
          create: {
            firstName: 'Sophie',
            lastName: 'Leroy',
          },
        },
      },
    });

    const parent = await prisma.user.create({
      data: {
        email: 'parent@test.com',
        password: 'hashedpassword',
        role: Role.PARENT,
        parentProfile: {
          create: {
            firstName: 'Pierre',
            lastName: 'Durand',
          },
        },
      },
    });

    const staff = await prisma.user.create({
      data: {
        email: 'staff@test.com',
        password: 'hashedpassword',
        role: Role.STAFF,
        staffProfile: {
          create: {
            firstName: 'Alice',
            lastName: 'Bernard',
          },
        },
      },
    });

    secretaryId = secretary.id;
    directorId = director.id;
    serviceManagerId = serviceManager.id;
    parentId = parent.id;
    staffId = staff.id;

    // Generate JWT tokens
    secretaryToken = jwtService.sign({
      sub: secretaryId,
      email: secretary.email,
      role: Role.SECRETARY,
    });
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
    parentToken = jwtService.sign({
      sub: parentId,
      email: parent.email,
      role: Role.PARENT,
    });
    staffToken = jwtService.sign({
      sub: staffId,
      email: staff.email,
      role: Role.STAFF,
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.blogReaction.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/blog (POST) - Create Post', () => {
    it('should allow secretary to create post', async () => {
      const response = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Test Post by Secretary')
        .field('description', 'Test Description')
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        title: 'Test Post by Secretary',
        description: 'Test Description',
        mediaUrl: null,
        mediaType: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        author: {
          id: secretaryId,
          firstName: 'Marie',
          lastName: 'Dupont',
        },
        reactions: {
          LIKE: 0,
          HEART: 0,
          SMILE: 0,
          CLAP: 0,
          PARTY: 0,
        },
        userReaction: undefined,
      });

      postId = response.body.id;
    });

    it('should allow director to create post', async () => {
      const response = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${directorToken}`)
        .field('title', 'Test Post by Director')
        .field('description', 'Test Description')
        .expect(201);

      expect(response.body.author).toEqual({
        id: directorId,
        firstName: 'Jean',
        lastName: 'Martin',
      });
    });

    it('should allow service manager to create post', async () => {
      const response = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${serviceManagerToken}`)
        .field('title', 'Test Post by Service Manager')
        .field('description', 'Test Description')
        .expect(201);

      expect(response.body.author).toEqual({
        id: serviceManagerId,
        firstName: 'Sophie',
        lastName: 'Leroy',
      });
    });

    it('should reject post creation by parent', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${parentToken}`)
        .field('title', 'Test Post by Parent')
        .field('description', 'Test Description')
        .expect(403);
    });

    it('should reject post creation by staff', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('title', 'Test Post by Staff')
        .field('description', 'Test Description')
        .expect(403);
    });

    it('should reject post creation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .field('title', 'Test Post')
        .field('description', 'Test Description')
        .expect(401);
    });

    it('should create post with image upload', async () => {
      // Create a test image file
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      const testImageBuffer = Buffer.from('fake-image-data');
      fs.writeFileSync(testImagePath, testImageBuffer);

      const response = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Post with Image')
        .field('description', 'Description with image')
        .attach('media', testImagePath)
        .expect(201);

      expect(response.body.mediaUrl).toMatch(/\/uploads\/blog\/.+\.jpg$/);
      expect(response.body.mediaType).toBe('IMAGE');

      // Clean up test file
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', '')
        .field('description', 'Test Description')
        .expect(400);

      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Test Title')
        .field('description', '')
        .expect(400);
    });
  });

  describe('/blog (GET) - Get All Posts', () => {
    it('should return all posts for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/blog')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('author');
      expect(response.body[0]).toHaveProperty('reactions');
    });

    it('should return posts ordered by creation date desc', async () => {
      const response = await request(app.getHttpServer())
        .get('/blog')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      // Check that posts are ordered by creation date (newest first)
      for (let i = 0; i < response.body.length - 1; i++) {
        const currentDate = new Date(response.body[i].createdAt);
        const nextDate = new Date(response.body[i + 1].createdAt);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(
          nextDate.getTime(),
        );
      }
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/blog').expect(401);
    });
  });

  describe('/blog/:id (GET) - Get Post by ID', () => {
    it('should return specific post', async () => {
      const response = await request(app.getHttpServer())
        .get(`/blog/${postId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body).toEqual({
        id: postId,
        title: 'Test Post by Secretary',
        description: 'Test Description',
        mediaUrl: null,
        mediaType: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        author: {
          id: secretaryId,
          firstName: 'Marie',
          lastName: 'Dupont',
        },
        reactions: {
          LIKE: 0,
          HEART: 0,
          SMILE: 0,
          CLAP: 0,
          PARTY: 0,
        },
        userReaction: undefined,
      });
    });

    it('should return 404 for non-existent post', async () => {
      await request(app.getHttpServer())
        .get('/blog/non-existent-id')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(404);
    });
  });

  describe('/blog/:id/reactions (POST) - Toggle Reaction', () => {
    it('should add reaction', async () => {
      const response = await request(app.getHttpServer())
        .post(`/blog/${postId}/reactions`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ type: 'LIKE' })
        .expect(201);

      expect(response.body.message).toBe('Réaction ajoutée');
    });

    it('should remove reaction when same type', async () => {
      const response = await request(app.getHttpServer())
        .post(`/blog/${postId}/reactions`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ type: 'LIKE' })
        .expect(201);

      expect(response.body.message).toBe('Réaction supprimée');
    });

    it('should change reaction when different type', async () => {
      // Add initial reaction
      await request(app.getHttpServer())
        .post(`/blog/${postId}/reactions`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ type: 'LIKE' })
        .expect(201);

      // Change to different reaction
      const response = await request(app.getHttpServer())
        .post(`/blog/${postId}/reactions`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ type: 'HEART' })
        .expect(201);

      expect(response.body.message).toBe('Réaction modifiée');
    });

    it('should validate reaction type', async () => {
      await request(app.getHttpServer())
        .post(`/blog/${postId}/reactions`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ type: 'INVALID_TYPE' })
        .expect(400);
    });
  });

  describe('/blog/:id (PUT) - Update Post', () => {
    it('should allow author to update own post', async () => {
      const response = await request(app.getHttpServer())
        .put(`/blog/${postId}`)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Updated Title')
        .field('description', 'Updated Description')
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('Updated Description');
    });

    it('should reject update by non-author', async () => {
      await request(app.getHttpServer())
        .put(`/blog/${postId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .field('title', 'Unauthorized Update')
        .field('description', 'Unauthorized Description')
        .expect(403);
    });

    it('should reject update by parent', async () => {
      await request(app.getHttpServer())
        .put(`/blog/${postId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .field('title', 'Unauthorized Update')
        .field('description', 'Unauthorized Description')
        .expect(403);
    });
  });

  describe('/blog/:id (DELETE) - Delete Post', () => {
    let postToDeleteId: string;

    beforeEach(async () => {
      // Create a post to delete
      const response = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Post to Delete')
        .field('description', 'This post will be deleted')
        .expect(201);

      postToDeleteId = response.body.id;
    });

    it('should allow director to delete any post', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/blog/${postToDeleteId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body.message).toBe('Post supprimé avec succès');
    });

    it('should allow service manager to delete any post', async () => {
      // Create another post
      const createResponse = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Another Post to Delete')
        .field('description', 'This post will be deleted by service manager')
        .expect(201);

      const response = await request(app.getHttpServer())
        .delete(`/blog/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${serviceManagerToken}`)
        .expect(200);

      expect(response.body.message).toBe('Post supprimé avec succès');
    });

    it('should allow secretary to delete own post', async () => {
      // Create another post
      const createResponse = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Secretary Own Post')
        .field('description', 'This post will be deleted by its author')
        .expect(201);

      const response = await request(app.getHttpServer())
        .delete(`/blog/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .expect(200);

      expect(response.body.message).toBe('Post supprimé avec succès');
    });

    it('should reject deletion by parent', async () => {
      await request(app.getHttpServer())
        .delete(`/blog/${postToDeleteId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });

    it('should reject deletion by staff', async () => {
      await request(app.getHttpServer())
        .delete(`/blog/${postToDeleteId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent post', async () => {
      await request(app.getHttpServer())
        .delete('/blog/non-existent-id')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(404);
    });
  });

  describe('File Upload Security', () => {
    it('should reject dangerous file types', async () => {
      // Create a test file with dangerous extension
      const testFilePath = path.join(__dirname, 'test-script.js');
      fs.writeFileSync(testFilePath, 'console.log("malicious code");');

      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Post with Script')
        .field('description', 'Description')
        .attach('media', testFilePath)
        .expect(400);

      // Clean up
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should enforce file size limits', async () => {
      // Create a large test file (> 50MB)
      const testFilePath = path.join(__dirname, 'large-file.jpg');
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      fs.writeFileSync(testFilePath, largeBuffer);

      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Post with Large File')
        .field('description', 'Description')
        .attach('media', testFilePath)
        .expect(413); // Payload Too Large

      // Clean up
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });

  describe('Data Validation', () => {
    it('should enforce title length limits', async () => {
      const longTitle = 'a'.repeat(201); // Exceeds 200 char limit

      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', longTitle)
        .field('description', 'Valid description')
        .expect(400);
    });

    it('should enforce description length limits', async () => {
      const longDescription = 'a'.repeat(2001); // Exceeds 2000 char limit

      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', 'Valid title')
        .field('description', longDescription)
        .expect(400);
    });

    it('should trim whitespace from title and description', async () => {
      const response = await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .field('title', '  Trimmed Title  ')
        .field('description', '  Trimmed Description  ')
        .expect(201);

      expect(response.body.title).toBe('Trimmed Title');
      expect(response.body.description).toBe('Trimmed Description');
    });
  });
});
