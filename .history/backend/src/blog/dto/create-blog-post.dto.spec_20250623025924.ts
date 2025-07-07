import { validate } from 'class-validator';
import { CreateBlogPostDto } from './create-blog-post.dto';
import { CreateReactionDto } from './create-reaction.dto';
import { ReactionType } from '@prisma/client';

describe('Blog DTOs', () => {
  describe('CreateBlogPostDto', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid Title';
      dto.description = 'Valid description';
      dto.mediaUrl = '/uploads/blog/image.jpg';
      dto.mediaType = 'IMAGE' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty title', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = '';
      dto.description = 'Valid description';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('title');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation with empty description', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid title';
      dto.description = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('description');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation with title too long', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'a'.repeat(201); // Exceeds 200 characters
      dto.description = 'Valid description';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('title');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail validation with description too long', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid title';
      dto.description = 'a'.repeat(2001); // Exceeds 2000 characters

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('description');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should pass validation with optional fields undefined', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid Title';
      dto.description = 'Valid description';
      // mediaUrl and mediaType are optional

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid media type', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid Title';
      dto.description = 'Valid description';
      dto.mediaUrl = '/uploads/blog/file.txt';
      dto.mediaType = 'INVALID_TYPE' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('mediaType');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should pass validation with valid IMAGE media type', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid Title';
      dto.description = 'Valid description';
      dto.mediaUrl = '/uploads/blog/image.jpg';
      dto.mediaType = 'IMAGE' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid VIDEO media type', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid Title';
      dto.description = 'Valid description';
      dto.mediaUrl = '/uploads/blog/video.mp4';
      dto.mediaType = 'VIDEO' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('CreateReactionDto', () => {
    it('should pass validation with valid LIKE reaction', async () => {
      const dto = new CreateReactionDto();
      dto.type = ReactionType.LIKE;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid HEART reaction', async () => {
      const dto = new CreateReactionDto();
      dto.type = ReactionType.HEART;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid SMILE reaction', async () => {
      const dto = new CreateReactionDto();
      dto.type = ReactionType.SMILE;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid CLAP reaction', async () => {
      const dto = new CreateReactionDto();
      dto.type = ReactionType.CLAP;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid PARTY reaction', async () => {
      const dto = new CreateReactionDto();
      dto.type = ReactionType.PARTY;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid reaction type', async () => {
      const dto = new CreateReactionDto();
      dto.type = 'INVALID_REACTION' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should fail validation with missing reaction type', async () => {
      const dto = new CreateReactionDto();
      // type is not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation with null reaction type', async () => {
      const dto = new CreateReactionDto();
      dto.type = null as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(2); // isNotEmpty and isEnum
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation with undefined reaction type', async () => {
      const dto = new CreateReactionDto();
      dto.type = undefined as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(2); // isNotEmpty and isEnum
      expect(errors[0].property).toBe('type');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode characters in title and description', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = '🎉 Événement spécial avec émojis 🎊';
      dto.description = 'Description avec caractères spéciaux: àáâãäåæçèéêëìíîïñòóôõöøùúûüý';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle exactly max length strings', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'a'.repeat(200); // Exactly 200 characters
      dto.description = 'b'.repeat(2000); // Exactly 2000 characters

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle whitespace-only strings', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = '   '; // Only whitespace
      dto.description = '\t\n\r '; // Only whitespace characters

      const errors = await validate(dto);
      // Should fail because whitespace-only strings are considered empty
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle mixed case media types', async () => {
      const dto = new CreateBlogPostDto();
      dto.title = 'Valid Title';
      dto.description = 'Valid description';
      dto.mediaUrl = '/uploads/blog/image.jpg';
      dto.mediaType = 'image' as any; // lowercase

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('mediaType');
    });
  });
}); 