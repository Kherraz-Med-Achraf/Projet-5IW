import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as io from 'socket.io-client';

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let mongoConnection: Connection;

  // Test tokens
  let staffToken: string;
  let directorToken: string;
  let parentToken: string;
  let anotherStaffToken: string;

  // Test data
  let staffId: string;
  let directorId: string;
  let parentId: string;
  let anotherStaffId: string;
  let chatId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());

    await app.init();
    await app.listen(0); // Use random port for testing

    // Clean databases
    await mongoConnection.db.dropDatabase();
    await prisma.user.deleteMany();
    await prisma.staffProfile.deleteMany();
    await prisma.directorProfile.deleteMany();
    await prisma.parentProfile.deleteMany();

    // Create test users
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

    const anotherStaff = await prisma.user.create({
      data: {
        email: 'staff2@test.com',
        password: 'hashedpassword',
        emailVerified: true,
        role: Role.STAFF,
        staffProfile: {
          create: {
            firstName: 'Bob',
            lastName: 'Smith',
            birthDate: new Date('1985-01-01'),
            phone: '0123456793',
            discipline: 'PSYCHOLOGIST',
          },
        },
      },
    });

    staffId = staff.id;
    directorId = director.id;
    parentId = parent.id;
    anotherStaffId = anotherStaff.id;

    // Generate JWT tokens
    staffToken = jwtService.sign({
      sub: staffId,
      email: staff.email,
      role: Role.STAFF,
    });
    directorToken = jwtService.sign({
      sub: directorId,
      email: director.email,
      role: Role.DIRECTOR,
    });
    parentToken = jwtService.sign({
      sub: parentId,
      email: parent.email,
      role: Role.PARENT,
    });
    anotherStaffToken = jwtService.sign({
      sub: anotherStaffId,
      email: anotherStaff.email,
      role: Role.STAFF,
    });
  });

  afterAll(async () => {
    // Clean up
    await mongoConnection.db.dropDatabase();
    await prisma.user.deleteMany();
    await prisma.staffProfile.deleteMany();
    await prisma.directorProfile.deleteMany();
    await prisma.parentProfile.deleteMany();
    await mongoConnection.close();
    await app.close();
  });

  describe('/chats (GET) - List Chats', () => {
    it('should return empty chats list initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/chats')
        .expect(401);
    });

    it('should return chats for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('/chats/contacts (GET) - Get Contacts', () => {
    it('should return allowed contacts for staff', async () => {
      const response = await request(app.getHttpServer())
        .get('/chats/contacts')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Staff should be able to contact directors and other staff
      const contactRoles = response.body.map(contact => contact.role);
      expect(contactRoles).toContain('DIRECTOR');
    });

    it('should return allowed contacts for director', async () => {
      const response = await request(app.getHttpServer())
        .get('/chats/contacts')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Director should be able to contact everyone
      const contactRoles = response.body.map(contact => contact.role);
      expect(contactRoles).toContain('STAFF');
    });

    it('should return allowed contacts for parent', async () => {
      const response = await request(app.getHttpServer())
        .get('/chats/contacts')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Parent should be able to contact staff and directors
      const contactRoles = response.body.map(contact => contact.role);
      expect(contactRoles).toContain('STAFF');
      expect(contactRoles).toContain('DIRECTOR');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/chats/contacts')
        .expect(401);
    });
  });

  describe('/chats (POST) - Create Chat', () => {
    it('should create chat between staff and director', async () => {
      const response = await request(app.getHttpServer())
        .post('/chats')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          participants: [staffId, directorId],
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.participants).toContain(staffId);
      expect(response.body.participants).toContain(directorId);
      chatId = response.body._id;
    });

    it('should create chat between parent and staff', async () => {
      const response = await request(app.getHttpServer())
        .post('/chats')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          participants: [parentId, staffId],
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.participants).toContain(parentId);
      expect(response.body.participants).toContain(staffId);
    });

    it('should prevent duplicate chat creation', async () => {
      // Try to create the same chat again
      await request(app.getHttpServer())
        .post('/chats')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          participants: [staffId, directorId],
        })
        .expect(400);
    });

    it('should validate participants', async () => {
      await request(app.getHttpServer())
        .post('/chats')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          participants: [], // Empty participants
        })
        .expect(400);
    });

    it('should reject chat creation with non-allowed contact', async () => {
      // Parent trying to contact another parent (should be forbidden)
      const anotherParent = await prisma.user.create({
        data: {
          email: 'parent2@test.com',
          password: 'hashedpassword',
          emailVerified: true,
          role: Role.PARENT,
          parentProfile: {
            create: {
              firstName: 'Marie',
              lastName: 'Martin',
              phone: '0123456794',
              address: '456 rue Test',
              legalResponsibility: 'Tuteur',
            },
          },
        },
      });

      await request(app.getHttpServer())
        .post('/chats')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          participants: [parentId, anotherParent.id],
        })
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/chats')
        .send({
          participants: [staffId, directorId],
        })
        .expect(401);
    });
  });

  describe('/chats/:id/messages (GET) - Get Messages', () => {
    it('should return empty messages for new chat', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should allow chat participants to view messages', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should reject non-participants from viewing messages', async () => {
      await request(app.getHttpServer())
        .get(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${anotherStaffToken}`)
        .expect(403);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chats/${chatId}/messages`)
        .query({ limit: 10, before: new Date().toISOString() })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent chat', async () => {
      await request(app.getHttpServer())
        .get('/chats/507f1f77bcf86cd799439011/messages')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });
  });

  describe('/chats/:chatId/messages (POST) - Send Message', () => {
    it('should send message in chat', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: 'Hello, this is a test message!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.content).toBe('Hello, this is a test message!');
      expect(response.body.author).toBe(staffId);
    });

    it('should allow other participant to send message', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          content: 'Reply from director',
        })
        .expect(201);

      expect(response.body.content).toBe('Reply from director');
      expect(response.body.author).toBe(directorId);
    });

    it('should reject message from non-participant', async () => {
      await request(app.getHttpServer())
        .post(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${anotherStaffToken}`)
        .send({
          content: 'Unauthorized message',
        })
        .expect(403);
    });

    it('should validate message content', async () => {
      await request(app.getHttpServer())
        .post(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: '', // Empty content
        })
        .expect(400);
    });

    it('should reject too long messages', async () => {
      const longMessage = 'a'.repeat(1001); // Assuming 1000 char limit
      await request(app.getHttpServer())
        .post(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: longMessage,
        })
        .expect(400);
    });
  });

  describe('/chats/:chatId/messages/:msgId (PATCH) - Edit Message', () => {
    let messageId: string;

    beforeEach(async () => {
      // Create a message to edit
      const response = await request(app.getHttpServer())
        .post(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: 'Original message content',
        })
        .expect(201);
      messageId = response.body._id;
    });

    it('should edit own message', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/chats/${chatId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: 'Edited message content',
        })
        .expect(200);

      expect(response.body.content).toBe('Edited message content');
      expect(response.body.edited).toBe(true);
    });

    it('should reject editing other user message', async () => {
      await request(app.getHttpServer())
        .patch(`/chats/${chatId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          content: 'Trying to edit someone else message',
        })
        .expect(403);
    });

    it('should validate edit content', async () => {
      await request(app.getHttpServer())
        .patch(`/chats/${chatId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: '', // Empty content
        })
        .expect(400);
    });

    it('should return 404 for non-existent message', async () => {
      await request(app.getHttpServer())
        .patch(`/chats/${chatId}/messages/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: 'Edit non-existent message',
        })
        .expect(404);
    });
  });

  describe('/chats/:chatId/messages/:msgId (DELETE) - Delete Message', () => {
    let messageId: string;

    beforeEach(async () => {
      // Create a message to delete
      const response = await request(app.getHttpServer())
        .post(`/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: 'Message to be deleted',
        })
        .expect(201);
      messageId = response.body._id;
    });

    it('should delete own message', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/chats/${chatId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.message).toContain('supprimé');
    });

    it('should reject deleting other user message', async () => {
      await request(app.getHttpServer())
        .delete(`/chats/${chatId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent message', async () => {
      await request(app.getHttpServer())
        .delete(`/chats/${chatId}/messages/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });
  });

  describe('/chats/:chatId/read (PATCH) - Mark as Read', () => {
    it('should mark chat as read', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/chats/${chatId}/read`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it('should allow both participants to mark as read', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/chats/${chatId}/read`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it('should reject non-participants from marking as read', async () => {
      await request(app.getHttpServer())
        .patch(`/chats/${chatId}/read`)
        .set('Authorization', `Bearer ${anotherStaffToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent chat', async () => {
      await request(app.getHttpServer())
        .patch('/chats/507f1f77bcf86cd799439011/read')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });
  });

  describe('Chat Workflow Integration', () => {
    it('should handle complete chat workflow', async () => {
      // 1. Get contacts
      const contactsResponse = await request(app.getHttpServer())
        .get('/chats/contacts')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(contactsResponse.body.length).toBeGreaterThan(0);

      // 2. Create chat
      const chatResponse = await request(app.getHttpServer())
        .post('/chats')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          participants: [staffId, anotherStaffId],
        })
        .expect(201);

      const workflowChatId = chatResponse.body._id;

      // 3. Send message
      const messageResponse = await request(app.getHttpServer())
        .post(`/chats/${workflowChatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: 'Workflow test message',
        })
        .expect(201);

      const workflowMessageId = messageResponse.body._id;

      // 4. Get messages
      const messagesResponse = await request(app.getHttpServer())
        .get(`/chats/${workflowChatId}/messages`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(messagesResponse.body).toHaveLength(1);
      expect(messagesResponse.body[0].content).toBe('Workflow test message');

      // 5. Edit message
      await request(app.getHttpServer())
        .patch(`/chats/${workflowChatId}/messages/${workflowMessageId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          content: 'Edited workflow message',
        })
        .expect(200);

      // 6. Mark as read
      await request(app.getHttpServer())
        .patch(`/chats/${workflowChatId}/read`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      // 7. List chats (should include new chat)
      const chatsResponse = await request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(chatsResponse.body.length).toBeGreaterThan(0);
      const chatExists = chatsResponse.body.some(chat => chat._id === workflowChatId);
      expect(chatExists).toBe(true);
    });

    it('should handle permission workflow correctly', async () => {
      // Test that different roles have appropriate permissions

      // Create chat between staff and director
      const chatResponse = await request(app.getHttpServer())
        .post('/chats')
        .set('Authorization', `Bearer ${anotherStaffToken}`)
        .send({
          participants: [anotherStaffId, directorId],
        })
        .expect(201);

      const testChatId = chatResponse.body._id;

      // Both participants can send messages
      await request(app.getHttpServer())
        .post(`/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${anotherStaffToken}`)
        .send({
          content: 'Message from staff',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          content: 'Message from director',
        })
        .expect(201);

      // Both can view messages
      await request(app.getHttpServer())
        .get(`/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${anotherStaffId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);

      // Non-participant cannot access
      await request(app.getHttpServer())
        .get(`/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/chats/${testChatId}/messages`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          content: 'Unauthorized message',
        })
        .expect(403);
    });

    it('should handle rate limiting appropriately', async () => {
      // Test rate limiting on chat creation
      const promises = [];
      for (let i = 0; i < 7; i++) { // Assuming limit is 5 per minute
        promises.push(
          request(app.getHttpServer())
            .post('/chats')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
              participants: [staffId, `fake-id-${i}`],
            })
        );
      }

      const results = await Promise.all(promises);
      const tooManyRequests = results.filter(res => res.status === 429);
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });
}); 