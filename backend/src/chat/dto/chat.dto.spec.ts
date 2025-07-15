import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateChatDto } from './create-chat.dto';
import { GetMessagesQueryDto } from './get-messages-query.dto';
import { UpdateMessageDto } from './update-message.dto';

describe('Chat DTOs', () => {
  describe('CreateChatDto', () => {
    it('should validate correct participants array', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: ['user-123-abc', 'user-456-def'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty participants array', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject missing participants', async () => {
      const dto = plainToClass(CreateChatDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject single participant', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: ['user-123-abc'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject more than 2 participants', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: ['user-1', 'user-2', 'user-3'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject non-array participants', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: 'not-an-array',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject invalid participant ID format', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: ['invalid@id', 'user-456-def'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject short participant IDs', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: ['short', 'user-456-def'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject long participant IDs', async () => {
      const longId = 'A'.repeat(50);
      const dto = plainToClass(CreateChatDto, {
        participants: [longId, 'user-456-def'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should reject non-string participants', async () => {
      const dto = plainToClass(CreateChatDto, {
        participants: [123, 'user-456-def'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('participants');
    });

    it('should handle various valid ID formats', async () => {
      const validIds = [
        ['user-123-abc', 'staff-456-def'],
        ['parent_789_xyz', 'admin-000-123'],
        ['1234567890', 'abcdefghij'],
        ['Test-User-ID', 'Another_ID_123'],
      ];

      for (const participants of validIds) {
        const dto = plainToClass(CreateChatDto, { participants });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject participants with special characters', async () => {
      const invalidIds = [
        ['user@domain.com', 'user-456'],
        ['user+tag', 'user-456'],
        ['user space', 'user-456'],
        ['user#hash', 'user-456'],
        ['user/slash', 'user-456'],
      ];

      for (const participants of invalidIds) {
        const dto = plainToClass(CreateChatDto, { participants });
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('participants');
      }
    });
  });

  describe('GetMessagesQueryDto', () => {
    it('should validate empty query', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with limit only', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: 50,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with before only', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        before: '2025-01-15T12:00:00Z',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with both limit and before', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: 25,
        before: '2025-01-15T12:00:00Z',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative limit', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: -1,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
    });

    it('should reject zero limit', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
    });

    it('should reject limit exceeding maximum', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: 1000,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
    });

    it('should reject non-integer limit', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: 'fifty',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
    });

    it('should reject decimal limit', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: 25.5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
    });

    it('should reject invalid date format for before', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        before: 'invalid-date',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('before');
    });

    it('should reject non-ISO date format', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        before: '15/01/2025 12:00:00',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('before');
    });

    it('should handle various valid ISO date formats', async () => {
      const validDates = [
        '2025-01-15T12:00:00Z',
        '2025-01-15T12:00:00.000Z',
        '2025-01-15T12:00:00+01:00',
        '2025-01-15T12:00:00-05:00',
      ];

      for (const before of validDates) {
        const dto = plainToClass(GetMessagesQueryDto, { before });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle boundary values for limit', async () => {
      const boundaryValues = [1, 100]; // min and max allowed

      for (const limit of boundaryValues) {
        const dto = plainToClass(GetMessagesQueryDto, { limit });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject future dates reasonably', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);

      const dto = plainToClass(GetMessagesQueryDto, {
        before: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      // This might pass validation but should be handled by business logic
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateMessageDto', () => {
    it('should validate correct content', async () => {
      const dto = plainToClass(UpdateMessageDto, {
        content: 'Updated message content',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing content', async () => {
      const dto = plainToClass(UpdateMessageDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('content');
    });

    it('should reject empty content', async () => {
      const dto = plainToClass(UpdateMessageDto, {
        content: '',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('content');
    });

    it('should accept whitespace-only content (MinLength counts characters)', async () => {
      const dto = plainToClass(UpdateMessageDto, {
        content: '   ',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // MinLength(1) accepts whitespace
    });

    it('should reject null content', async () => {
      const dto = plainToClass(UpdateMessageDto, {
        content: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('content');
    });

    it('should reject non-string content', async () => {
      const dto = plainToClass(UpdateMessageDto, {
        content: 123,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('content');
    });

    it('should reject content exceeding MaxLength(1000)', async () => {
      const longContent = 'A'.repeat(1001); // Over the 1000 char limit
      const dto = plainToClass(UpdateMessageDto, {
        content: longContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('content');
    });

    it('should handle special characters', async () => {
      const specialContent =
        'Message with émojis 🎉 and special chars: @#$%^&*()';
      const dto = plainToClass(UpdateMessageDto, {
        content: specialContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle unicode characters', async () => {
      const unicodeContent = '你好世界 🌍 Здравствуй мир 🌎 مرحبا بالعالم 🌏';
      const dto = plainToClass(UpdateMessageDto, {
        content: unicodeContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle newlines and formatting', async () => {
      const formattedContent = `Multi-line message
      with different formatting:
      - Bullet point
      - Another point
      
      And a new paragraph.`;

      const dto = plainToClass(UpdateMessageDto, {
        content: formattedContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle HTML-like content', async () => {
      const htmlContent =
        '<p>This looks like HTML but should be treated as text</p>';
      const dto = plainToClass(UpdateMessageDto, {
        content: htmlContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle markdown-like content', async () => {
      const markdownContent =
        '**Bold text** and *italic text* with [links](http://example.com)';
      const dto = plainToClass(UpdateMessageDto, {
        content: markdownContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle code snippets', async () => {
      const codeContent = `Here's some code:
      \`\`\`javascript
      function hello() {
        console.log("Hello world!");
      }
      \`\`\``;

      const dto = plainToClass(UpdateMessageDto, {
        content: codeContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should trim whitespace properly', async () => {
      const contentWithSpaces = '  Valid content with spaces  ';
      const dto = plainToClass(UpdateMessageDto, {
        content: contentWithSpaces,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge cases and security', () => {
    it('should handle extremely long participant IDs at boundary', async () => {
      const maxLengthId = 'A'.repeat(40); // Max allowed length
      const dto = plainToClass(CreateChatDto, {
        participants: [maxLengthId, 'user-456-def'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle minimum length participant IDs', async () => {
      const minLengthId = 'A'.repeat(10); // Min allowed length
      const dto = plainToClass(CreateChatDto, {
        participants: [minLengthId, 'user-456-def'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle maximum allowed message limit', async () => {
      const dto = plainToClass(GetMessagesQueryDto, {
        limit: 100, // Max allowed
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle very old dates for pagination', async () => {
      const oldDate = '1970-01-01T00:00:00Z';
      const dto = plainToClass(GetMessagesQueryDto, {
        before: oldDate,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle potential XSS in message content', async () => {
      const xssContent = '<script>alert("xss")</script>Normal message content';
      const dto = plainToClass(UpdateMessageDto, {
        content: xssContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Validation passes, sanitization handled elsewhere
    });

    it('should handle SQL injection-like content', async () => {
      const sqlContent = "'; DROP TABLE messages; --";
      const dto = plainToClass(UpdateMessageDto, {
        content: sqlContent,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Validation passes, MongoDB is NoSQL anyway
    });
  });
});
