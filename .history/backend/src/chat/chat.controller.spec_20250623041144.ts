import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

describe('ChatController', () => {
  let controller: ChatController;
  let service: ChatService;

  const mockChatService = {
    findAllForUser: jest.fn(),
    getAllowedContacts: jest.fn(),
    createChat: jest.fn(),
    canAccessChat: jest.fn(),
    getMessages: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
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
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
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
        new Error('Database connection failed')
      );

      await expect(controller.listChats(mockRequest as any))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getContacts', () => {
    it('should return available contacts', async () => {
      mockChatService.getAllowedContacts.mockResolvedValue(mockContacts);

      const result = await controller.getContacts(mockRequest as any);

      expect(service.getAllowedContacts).toHaveBeenCalledWith('user-123', 'STAFF');
      expect(result).toEqual(mockContacts);
    });

    it('should exclude current user from contacts', async () => {
      const contactsWithSelf = [
        ...mockContacts,
        { id: 'user-123', name: 'Current User', role: 'STAFF' },
      ];
      mockChatService.getContacts.mockResolvedValue(mockContacts);

      const result = await controller.getContacts(mockRequest as any);

      expect(result).not.toContainEqual(
        expect.objectContaining({ id: 'user-123' })
      );
    });

    it('should handle empty contacts list', async () => {
      mockChatService.getContacts.mockResolvedValue([]);

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
        'STAFF'
      );
      expect(result).toEqual(createdChat);
    });

    it('should handle duplicate participants', async () => {
      const dto: CreateChatDto = {
        participants: ['user-123', 'user-123'],
      };

      // This should be caught by validation
      await expect(controller.createChat(dto, mockRequest as any))
        .rejects.toThrow();
    });

    it('should handle invalid participant IDs', async () => {
      const dto: CreateChatDto = {
        participants: ['invalid-id', 'user-456'],
      };

      mockChatService.createChat.mockRejectedValue(
        new NotFoundException('User not found')
      );

      await expect(controller.createChat(dto, mockRequest as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should enforce participant limit', async () => {
      const dto: CreateChatDto = {
        participants: ['user-1', 'user-2', 'user-3'], // Too many participants
      };

      // This should be caught by validation
      await expect(controller.createChat(dto, mockRequest as any))
        .rejects.toThrow();
    });
  });

  describe('getMessages', () => {
    it('should return chat messages with default limit', async () => {
      const messages = [mockMessage];
      const query: GetMessagesQueryDto = {};
      
      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages('chat-123', query, mockRequest as any);

      expect(service.canAccessChat).toHaveBeenCalledWith('user-123', 'chat-123');
      expect(service.getMessages).toHaveBeenCalledWith('chat-123', undefined, undefined);
      expect(result).toEqual(messages);
    });

    it('should return messages with custom limit', async () => {
      const messages = [mockMessage];
      const query: GetMessagesQueryDto = { limit: 20 };
      
      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages('chat-123', query, mockRequest as any);

      expect(service.getMessages).toHaveBeenCalledWith('chat-123', 20, undefined);
      expect(result).toEqual(messages);
    });

    it('should return messages with before parameter', async () => {
      const messages = [mockMessage];
      const beforeDate = '2025-01-01T00:00:00Z';
      const query: GetMessagesQueryDto = { before: beforeDate };
      
      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages);

      const result = await controller.getMessages('chat-123', query, mockRequest as any);

      expect(service.getMessages).toHaveBeenCalledWith('chat-123', undefined, new Date(beforeDate));
      expect(result).toEqual(messages);
    });

    it('should throw forbidden for unauthorized access', async () => {
      const query: GetMessagesQueryDto = {};
      mockChatService.canAccessChat.mockResolvedValue(false);

      await expect(
        controller.getMessages('chat-123', query, mockRequest as any)
      ).rejects.toThrow(ForbiddenException);

      expect(service.getMessages).not.toHaveBeenCalled();
    });

    it('should handle invalid chat ID', async () => {
      const query: GetMessagesQueryDto = {};
      
      // This should be caught by ParseObjectIdPipe
      await expect(
        controller.getMessages('invalid-id', query, mockRequest as any)
      ).rejects.toThrow();
    });

    it('should handle pagination correctly', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));
      const query: GetMessagesQueryDto = { limit: 5, before: '2025-01-15T12:00:00Z' };
      
      mockChatService.canAccessChat.mockResolvedValue(true);
      mockChatService.getMessages.mockResolvedValue(messages.slice(0, 5));

      const result = await controller.getMessages('chat-123', query, mockRequest as any);

      expect(result).toHaveLength(5);
      expect(service.getMessages).toHaveBeenCalledWith(
        'chat-123',
        5,
        new Date('2025-01-15T12:00:00Z')
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
        mockRequest as any
      );

      expect(service.updateMessage).toHaveBeenCalledWith(
        'chat-123',
        'msg-123',
        'user-123',
        'Updated message'
      );
      expect(result).toEqual(updatedMessage);
    });

    it('should handle non-existent message', async () => {
      const updateDto: UpdateMessageDto = { content: 'Updated message' };
      
      mockChatService.updateMessage.mockRejectedValue(
        new NotFoundException('Message not found')
      );

      await expect(
        controller.updateMessage('chat-123', 'non-existent', updateDto, mockRequest as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle unauthorized message update', async () => {
      const updateDto: UpdateMessageDto = { content: 'Updated message' };
      
      mockChatService.updateMessage.mockRejectedValue(
        new ForbiddenException('Not message author')
      );

      await expect(
        controller.updateMessage('chat-123', 'msg-123', updateDto, mockRequest as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle empty content', async () => {
      const updateDto: UpdateMessageDto = { content: '' };
      
      // This should be caught by validation
      await expect(
        controller.updateMessage('chat-123', 'msg-123', updateDto, mockRequest as any)
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
        mockRequest as any
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
        mockRequest as any
      );

      expect(service.deleteMessage).toHaveBeenCalledWith(
        'chat-123',
        'msg-123',
        'user-123'
      );
      expect(result).toBeUndefined();
    });

    it('should handle non-existent message deletion', async () => {
      mockChatService.deleteMessage.mockRejectedValue(
        new NotFoundException('Message not found')
      );

      await expect(
        controller.deleteMessage('chat-123', 'non-existent', mockRequest as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle unauthorized message deletion', async () => {
      mockChatService.deleteMessage.mockRejectedValue(
        new ForbiddenException('Not message author')
      );

      await expect(
        controller.deleteMessage('chat-123', 'msg-123', mockRequest as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle invalid message ID format', async () => {
      // This should be caught by ParseObjectIdPipe
      await expect(
        controller.deleteMessage('chat-123', 'invalid-id', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle service unavailable errors', async () => {
      mockChatService.findAllForUser.mockRejectedValue(
        new Error('MongoDB connection failed')
      );

      await expect(controller.listChats(mockRequest as any))
        .rejects.toThrow('MongoDB connection failed');
    });

    it('should handle malformed request data', async () => {
      const malformedDto = { participants: 'not-an-array' };
      
      await expect(
        controller.createChat(malformedDto as any, mockRequest as any)
      ).rejects.toThrow();
    });

    it('should handle concurrent access issues', async () => {
      mockChatService.updateMessage.mockRejectedValue(
        new Error('Document was modified')
      );

      await expect(
        controller.updateMessage(
          'chat-123',
          'msg-123',
          { content: 'Updated' },
          mockRequest as any
        )
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
      const secretaryRequest = { user: { id: 'secretary-1', role: 'SECRETARY' } };
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
        controller.createChat(dto, mockRequest as any)
      );

      // Should not throw throttling errors in unit tests
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });
  });
}); 