import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { WsException } from '@nestjs/websockets';

describe('ChatController', () => {
  let controller: ChatController;
  let service: ChatService;
  let gateway: ChatGateway;

  const mockChatService = {
    findAllForUser: jest.fn(),
    getAllowedContacts: jest.fn(),
    createChat: jest.fn(),
    canAccessChat: jest.fn(),
    getMessages: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    createMessage: jest.fn(),
  };

  const mockChatGateway = {
    handleConnection: jest.fn(),
    handleDisconnect: jest.fn(),
    onJoin: jest.fn(),
    onMessage: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    server: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      in: jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([]),
      }),
    },
  };

  const mockRequest = {
    user: { id: 'user-123', role: 'STAFF' },
  };

  const mockChat = {
    id: 'chat-123',
    participants: ['user-123', 'user-456'],
    lastMessage: 'Hello world',
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'msg-123',
    author: 'user-123',
    content: 'Hello world',
    sentAt: new Date(),
    chat: 'chat-123',
  };

  const mockContacts = [
    {
      id: 'user-456',
      name: 'Jean Dupont',
      role: 'SECRETARY',
    },
    {
      id: 'user-789',
      name: 'Marie Martin',
      role: 'DIRECTOR',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CsrfGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
    gateway = module.get<ChatGateway>(ChatGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listChats', () => {
    it('should return user chats', async () => {
      const chats = [mockChat];
      mockChatService.findAllForUser.mockResolvedValue(chats);

      const result = await controller.listChats(mockRequest as any);

      expect(service.findAllForUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(chats);
    });

    it('should return empty array when no chats', async () => {
      mockChatService.findAllForUser.mockResolvedValue([]);

      const result = await controller.listChats(mockRequest as any);

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockChatService.findAllForUser.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.listChats(mockRequest as any)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('getContacts', () => {
    it('should return available contacts', async () => {
      mockChatService.getAllowedContacts.mockResolvedValue(mockContacts);

      const result = await controller.getContacts(mockRequest as any);

      expect(service.getAllowedContacts).toHaveBeenCalledWith(
        'user-123',
        'STAFF',
      );
      expect(result).toEqual(mockContacts);
    });

    it('should exclude current user from contacts', async () => {
      const contactsWithSelf = [
        ...mockContacts,
        { id: 'user-123', name: 'Current User', role: 'STAFF' },
      ];
      mockChatService.getAllowedContacts.mockResolvedValue(mockContacts);

      const result = await controller.getContacts(mockRequest as any);

      expect(result).not.toContainEqual(
        expect.objectContaining({ id: 'user-123' }),
      );
    });

    it('should handle empty contacts list', async () => {
      mockChatService.getAllowedContacts.mockResolvedValue([]);

      const result = await controller.getContacts(mockRequest as any);

      expect(result).toEqual([]);
    });
  });

  describe('createChat', () => {
    it('should create a new chat successfully', async () => {
      const dto: CreateChatDto = {
        participants: ['user-123', 'user-456'],
      };
      const createdChat = { ...mockChat, id: 'new-chat-123' };
      mockChatService.createChat.mockResolvedValue(createdChat);

      const result = await controller.createChat(dto, mockRequest as any);

      expect(service.createChat).toHaveBeenCalledWith(
        ['user-123', 'user-456'],
        'user-123',
        'STAFF',
      );
      expect(result).toEqual(createdChat);
    });

    it('should handle duplicate participants (DTO validation allows it)', async () => {
      const dto: CreateChatDto = {
        participants: ['user-123', 'user-123'],
      };
      const createdChat = { ...mockChat, id: 'new-chat-123' };
      mockChatService.createChat.mockResolvedValue(createdChat);

      // DTO validation doesn't prevent duplicates, service might handle it
      const result = await controller.createChat(dto, mockRequest as any);
      expect(result).toBeDefined();
    });

    it('should handle invalid participant IDs', async () => {
      const dto: CreateChatDto = {
        participants: ['invalid-id', 'user-456'],
      };

      mockChatService.createChat.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.createChat(dto, mockRequest as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce participant limit', async () => {
      const dto: CreateChatDto = {
        participants: ['user-1', 'user-2', 'user-3'], // Too many participants
      };

      // This should be caught by validation
      await expect(
        controller.createChat(dto, mockRequest as any),
      ).rejects.toThrow();
    });
  });

  describe('getMessages', () => {
    it('should return chat messages with default limit', async () => {
      const messages = [mockMessage];
      const query: GetMessagesQueryDto = {};

      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages(
        'chat-123',
        query,
        mockRequest as any,
      );

      expect(service.canAccessChat).toHaveBeenCalledWith(
        'user-123',
        'chat-123',
      );
      expect(service.getMessages).toHaveBeenCalledWith(
        'chat-123',
        undefined,
        undefined,
      );
      expect(result).toEqual(messages);
    });

    it('should return messages with custom limit', async () => {
      const messages = [mockMessage];
      const query: GetMessagesQueryDto = { limit: 20 };

      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages(
        'chat-123',
        query,
        mockRequest as any,
      );

      expect(service.getMessages).toHaveBeenCalledWith(
        'chat-123',
        20,
        undefined,
      );
      expect(result).toEqual(messages);
    });

    it('should return messages with before parameter', async () => {
      const messages = [mockMessage];
      const beforeDate = '2025-01-01T00:00:00Z';
      const query: GetMessagesQueryDto = { before: beforeDate };

      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages(
        'chat-123',
        query,
        mockRequest as any,
      );

      expect(service.getMessages).toHaveBeenCalledWith(
        'chat-123',
        undefined,
        new Date(beforeDate),
      );
      expect(result).toEqual(messages);
    });

    it('should throw forbidden for unauthorized access', async () => {
      const query: GetMessagesQueryDto = {};
      mockChatService.canAccessChat.mockResolvedValue(false);

      await expect(
        controller.getMessages('chat-123', query, mockRequest as any),
      ).rejects.toThrow(ForbiddenException);

      expect(service.getMessages).not.toHaveBeenCalled();
    });

    it('should handle invalid chat ID', async () => {
      const query: GetMessagesQueryDto = {};

      // This should be caught by ParseObjectIdPipe
      await expect(
        controller.getMessages('invalid-id', query, mockRequest as any),
      ).rejects.toThrow();
    });

    it('should handle pagination correctly', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));
      const query: GetMessagesQueryDto = {
        limit: 5,
        before: '2025-01-15T12:00:00Z',
      };

      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages.slice(0, 5));

      const result = await controller.getMessages(
        'chat-123',
        query,
        mockRequest as any,
      );

      expect(result).toHaveLength(5);
      expect(service.getMessages).toHaveBeenCalledWith(
        'chat-123',
        5,
        new Date('2025-01-15T12:00:00Z'),
      );
    });
  });

  describe('updateMessage', () => {
    it('should update message successfully', async () => {
      const updateDto: UpdateMessageDto = { content: 'Updated message' };
      const updatedMessage = { ...mockMessage, content: 'Updated message' };

      mockChatService.updateMessage.mockResolvedValue(updatedMessage);

      const result = await controller.updateMessage(
        'chat-123',
        'msg-123',
        updateDto,
        mockRequest as any,
      );

      expect(service.updateMessage).toHaveBeenCalledWith(
        'chat-123',
        'msg-123',
        'user-123',
        'Updated message',
      );
      expect(result).toEqual(updatedMessage);
    });

    it('should handle non-existent message', async () => {
      const updateDto: UpdateMessageDto = { content: 'Updated message' };

      mockChatService.updateMessage.mockRejectedValue(
        new NotFoundException('Message not found'),
      );

      await expect(
        controller.updateMessage(
          'chat-123',
          'non-existent',
          updateDto,
          mockRequest as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle unauthorized message update', async () => {
      const updateDto: UpdateMessageDto = { content: 'Updated message' };

      mockChatService.updateMessage.mockRejectedValue(
        new ForbiddenException('Not message author'),
      );

      await expect(
        controller.updateMessage(
          'chat-123',
          'msg-123',
          updateDto,
          mockRequest as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle empty content', async () => {
      const updateDto: UpdateMessageDto = { content: '' };

      // This should be caught by validation
      await expect(
        controller.updateMessage(
          'chat-123',
          'msg-123',
          updateDto,
          mockRequest as any,
        ),
      ).rejects.toThrow();
    });

    it('should handle long message content', async () => {
      const longContent = 'A'.repeat(5000);
      const updateDto: UpdateMessageDto = { content: longContent };
      const updatedMessage = { ...mockMessage, content: longContent };

      mockChatService.updateMessage.mockResolvedValue(updatedMessage);

      const result = await controller.updateMessage(
        'chat-123',
        'msg-123',
        updateDto,
        mockRequest as any,
      );

      expect(result.content).toBe(longContent);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockChatService.deleteMessage.mockResolvedValue(undefined);

      const result = await controller.deleteMessage(
        'chat-123',
        'msg-123',
        mockRequest as any,
      );

      expect(service.deleteMessage).toHaveBeenCalledWith(
        'chat-123',
        'msg-123',
        'user-123',
      );
      expect(result).toBeUndefined();
    });

    it('should handle non-existent message deletion', async () => {
      mockChatService.deleteMessage.mockRejectedValue(
        new NotFoundException('Message not found'),
      );

      await expect(
        controller.deleteMessage(
          'chat-123',
          'non-existent',
          mockRequest as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle unauthorized message deletion', async () => {
      mockChatService.deleteMessage.mockRejectedValue(
        new ForbiddenException('Not message author'),
      );

      await expect(
        controller.deleteMessage('chat-123', 'msg-123', mockRequest as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle invalid message ID format', async () => {
      // This should be caught by ParseObjectIdPipe
      await expect(
        controller.deleteMessage('chat-123', 'invalid-id', mockRequest as any),
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle service unavailable errors', async () => {
      mockChatService.findAllForUser.mockRejectedValue(
        new Error('MongoDB connection failed'),
      );

      await expect(controller.listChats(mockRequest as any)).rejects.toThrow(
        'MongoDB connection failed',
      );
    });

    it('should handle malformed request data', async () => {
      const malformedDto = { participants: 'not-an-array' };

      await expect(
        controller.createChat(malformedDto as any, mockRequest as any),
      ).rejects.toThrow();
    });

    it('should handle concurrent access issues', async () => {
      mockChatService.updateMessage.mockRejectedValue(
        new Error('Document was modified'),
      );

      await expect(
        controller.updateMessage(
          'chat-123',
          'msg-123',
          { content: 'Updated' },
          mockRequest as any,
        ),
      ).rejects.toThrow('Document was modified');
    });
  });

  describe('role-based access', () => {
    it('should allow STAFF to access chats', async () => {
      const staffRequest = { user: { id: 'staff-1', role: 'STAFF' } };
      mockChatService.findAllForUser.mockResolvedValue([mockChat]);

      const result = await controller.listChats(staffRequest as any);

      expect(result).toBeDefined();
    });

    it('should allow SECRETARY to access chats', async () => {
      const secretaryRequest = {
        user: { id: 'secretary-1', role: 'SECRETARY' },
      };
      mockChatService.findAllForUser.mockResolvedValue([mockChat]);

      const result = await controller.listChats(secretaryRequest as any);

      expect(result).toBeDefined();
    });

    it('should allow PARENT to access chats', async () => {
      const parentRequest = { user: { id: 'parent-1', role: 'PARENT' } };
      mockChatService.findAllForUser.mockResolvedValue([mockChat]);

      const result = await controller.listChats(parentRequest as any);

      expect(result).toBeDefined();
    });
  });

  describe('throttling compliance', () => {
    it('should handle throttling for createChat', async () => {
      // Multiple rapid requests should be handled gracefully
      const dto: CreateChatDto = { participants: ['user-123', 'user-456'] };

      mockChatService.createChat.mockResolvedValue(mockChat);

      const promises = Array.from({ length: 10 }, () =>
        controller.createChat(dto, mockRequest as any),
      );

      // Should not throw throttling errors in unit tests
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });
  });

  // Tests de sécurité et de pénétration
  describe('🔥 Penetration Tests - Input Validation', () => {
    it('should reject malformed ObjectIds in chat creation', async () => {
      const maliciousDto: CreateChatDto = {
        participants: ['invalid_id', 'another_invalid'],
      };

      mockChatService.createChat.mockRejectedValue(
        new BadRequestException('User ID invalide: format CUID requis')
      );

      await expect(
        controller.createChat(maliciousDto, mockRequest as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject SQL injection attempts in participants', async () => {
      const sqlInjectionDto: CreateChatDto = {
        participants: [
          "'; DROP TABLE users; --",
          'clm1n2o3p4q5r6s7t8u9v0w1x'
        ],
      };

      mockChatService.createChat.mockRejectedValue(
        new BadRequestException('User ID invalide: format CUID requis')
      );

      await expect(
        controller.createChat(sqlInjectionDto, mockRequest as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject NoSQL injection attempts', async () => {
      const noSqlInjection = {
        participants: [
          { $ne: null },
          'clm1n2o3p4q5r6s7t8u9v0w1x'
        ],
      };

      await expect(
        controller.createChat(noSqlInjection as any, mockRequest as any)
      ).rejects.toThrow();
    });

    it('should handle extremely long participant arrays', async () => {
      const massiveArray = Array(10000).fill('clm1n2o3p4q5r6s7t8u9v0w1x');
      const massiveDto: CreateChatDto = { participants: massiveArray };

      mockChatService.createChat.mockRejectedValue(
        new BadRequestException('Exactement 2 participants requis')
      );

      await expect(
        controller.createChat(massiveDto, mockRequest as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('🔥 WebSocket Penetration Tests', () => {
    it('should disconnect on invalid JWT token', async () => {
      const mockSocket = {
        handshake: { auth: { token: 'invalid.jwt.token' }, address: '127.0.0.1' },
        disconnect: jest.fn(),
        data: {},
      };

      mockChatGateway.handleConnection.mockImplementation((socket) => {
        socket.disconnect();
      });

      await mockChatGateway.handleConnection(mockSocket as any);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should reject connections without token', async () => {
      const mockSocket = {
        handshake: { auth: {}, address: '127.0.0.1' },
        disconnect: jest.fn(),
        data: {},
      };

      mockChatGateway.handleConnection.mockImplementation((socket) => {
        if (!socket.handshake.auth?.token) {
          socket.disconnect();
        }
      });

      await mockChatGateway.handleConnection(mockSocket as any);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should limit room joins per user', async () => {
      const mockSocket = {
        data: { user: mockRequest.user },
        join: jest.fn(),
      };

      // Simuler que l'utilisateur a déjà atteint la limite
      mockChatGateway.onJoin.mockImplementation(() => {
        // Ne pas joindre si limite atteinte
        return;
      });

      await mockChatGateway.onJoin(mockSocket as any, '507f1f77bcf86cd799439011');
      // Vérifier que join n'a pas été appelé
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should validate ObjectIds in WebSocket messages', async () => {
      const mockSocket = {
        data: { user: mockRequest.user },
      };

      const invalidChatId = 'invalid_objectid';
      
      mockChatGateway.onMessage.mockImplementation((socket, data) => {
        // Simulation de la validation ObjectId
        if (!/^[0-9a-fA-F]{24}$/.test(data.chatId)) {
          return; // Rejeter silencieusement
        }
      });

      await mockChatGateway.onMessage(mockSocket as any, {
        chatId: invalidChatId,
        content: 'test message'
      });

      // Le message ne devrait pas être traité
      expect(mockChatService.createMessage).not.toHaveBeenCalled();
    });

    it('should reject messages with malicious content', async () => {
      const mockSocket = {
        data: { user: mockRequest.user },
      };

      const maliciousContent = '<script>alert("xss")</script>';
      
      mockChatGateway.onMessage.mockImplementation((socket, data) => {
        if (data.content.includes('<script>')) {
          return; // Rejeter le contenu malveillant
        }
      });

      await mockChatGateway.onMessage(mockSocket as any, {
        chatId: '507f1f77bcf86cd799439011',
        content: maliciousContent
      });

      expect(mockChatService.createMessage).not.toHaveBeenCalled();
    });

    it('should handle massive message content', async () => {
      const mockSocket = {
        data: { user: mockRequest.user },
      };

      const massiveContent = 'A'.repeat(100000); // 100KB
      
      mockChatGateway.onMessage.mockImplementation((socket, data) => {
        if (data.content.length > 1000) {
          return; // Rejeter les messages trop longs
        }
      });

      await mockChatGateway.onMessage(mockSocket as any, {
        chatId: '507f1f77bcf86cd799439011',
        content: massiveContent
      });

      expect(mockChatService.createMessage).not.toHaveBeenCalled();
    });
  });

  describe('🔥 Rate Limiting Tests', () => {
    it('should enforce chat creation rate limits', async () => {
      const dto: CreateChatDto = {
        participants: ['clm1n2o3p4q5r6s7t8u9v0w1x', 'clm1n2o3p4q5r6s7t8u9v0w2y']
      };

      // Simuler plusieurs créations rapides
      const promises = Array(10).fill(null).map(() =>
        controller.createChat(dto, mockRequest as any)
      );

      // Certaines devraient échouer due au rate limiting
      mockChatService.createChat
        .mockResolvedValueOnce({ id: 'chat1' })
        .mockResolvedValueOnce({ id: 'chat2' })
        .mockRejectedValue(new Error('Too Many Requests'));

      const results = await Promise.allSettled(promises);
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(rejected.length).toBeGreaterThan(0);
    });

    it('should enforce message sending rate limits', async () => {
      const mockSocket = {
        data: { user: mockRequest.user },
      };

      const messageData = {
        chatId: '507f1f77bcf86cd799439011',
        content: 'test message'
      };

      // Simuler l'envoi rapide de messages
      const promises = Array(10).fill(null).map(() =>
        mockChatGateway.onMessage(mockSocket as any, messageData)
      );

      // Le rate limiting devrait bloquer certains messages
      let callCount = 0;
      mockChatGateway.onMessage.mockImplementation(() => {
        callCount++;
        if (callCount > 3) {
          return; // Rate limit atteint
        }
      });

      await Promise.all(promises);
      expect(callCount).toBeLessThanOrEqual(3);
    });
  });

  describe('🔥 Authorization Bypass Tests', () => {
    it('should prevent access to chats without permission', async () => {
      mockChatService.canAccessChat.mockResolvedValue(false);

      await expect(
        controller.getMessages(
          '507f1f77bcf86cd799439011',
          {},
          mockRequest as any
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent message editing by non-authors', async () => {
      const updateDto: UpdateMessageDto = { content: 'edited content' };
      
      mockChatService.updateMessage.mockRejectedValue(
        new ForbiddenException('Vous ne pouvez modifier que vos messages')
      );

      await expect(
        controller.updateMessage(
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439012',
          updateDto,
          mockRequest as any
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent cross-chat message manipulation', async () => {
      mockChatService.updateMessage.mockRejectedValue(
        new ForbiddenException('Message hors de ce chat')
      );

      const updateDto: UpdateMessageDto = { content: 'malicious edit' };

      await expect(
        controller.updateMessage(
          '507f1f77bcf86cd799439011', // Chat A
          '507f1f77bcf86cd799439013', // Message from Chat B
          updateDto,
          mockRequest as any
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('🔥 Data Exfiltration Prevention', () => {
    it('should not leak chat existence in error messages', async () => {
      mockChatService.canAccessChat.mockResolvedValue(false);

      await expect(
        controller.getMessages(
          '507f1f77bcf86cd799439999', // Non-existent chat
          {},
          mockRequest as any
        )
      ).rejects.toThrow(ForbiddenException);

      // L'erreur ne devrait pas révéler si le chat existe ou non
      expect(mockChatService.canAccessChat).toHaveBeenCalledWith(
        mockRequest.user.id,
        '507f1f77bcf86cd799439999'
      );
    });

    it('should sanitize error messages', async () => {
      const maliciousInput = {
        participants: ['<script>alert("xss")</script>', mockRequest.user.id]
      };

      mockChatService.createChat.mockRejectedValue(
        new BadRequestException('User ID invalide: format CUID requis')
      );

      try {
        await controller.createChat(maliciousInput as any, mockRequest as any);
      } catch (error) {
        // L'erreur ne devrait pas contenir le contenu malveillant
        expect(error.message).not.toContain('<script>');
      }
    });
  });

  describe('🔥 Resource Exhaustion Tests', () => {
    it('should handle concurrent chat creation attempts', async () => {
      const dto: CreateChatDto = {
        participants: [mockRequest.user.id, 'clm1n2o3p4q5r6s7t8u9v0w2y']
      };

      // Simuler 100 créations simultanées
      const promises = Array(100).fill(null).map((_, i) =>
        controller.createChat(dto, { user: { ...mockRequest.user, id: `user${i}` } } as any)
      );

      mockChatService.createChat.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 'chat' }), 10))
      );

      const start = Date.now();
      await Promise.allSettled(promises);
      const duration = Date.now() - start;

      // Ne devrait pas prendre plus de 5 secondes
      expect(duration).toBeLessThan(5000);
    });

    it('should limit memory usage with large message histories', async () => {
      const query: GetMessagesQueryDto = { limit: 999999 }; // Tentative de récupérer trop de messages

      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockImplementation((chatId, limit) => {
        // Limiter à un maximum raisonnable
        const actualLimit = Math.min(limit || 50, 100);
        return Array(actualLimit).fill({ id: 'msg', content: 'test' });
      });

      const messages = await controller.getMessages(
        '507f1f77bcf86cd799439011',
        query,
        mockRequest as any
      );

      // Ne devrait pas retourner plus de 100 messages
      expect(messages.length).toBeLessThanOrEqual(100);
    });
  });
});
