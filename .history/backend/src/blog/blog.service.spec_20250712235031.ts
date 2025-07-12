import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Role, ReactionType } from '@prisma/client';

/* ------------------------------------------------------------------- */
/*                            Prisma Mock                              */
/* ------------------------------------------------------------------- */
class PrismaMock {
  /* in-memory stores */
  _posts: any[] = [];
  _reactions: any[] = [];
  _idCounter = 1;

  /* ---------------- BlogPost ---------------- */
  blogPost = {
    create: jest.fn(async ({ data, include }: any) => {
      const now = new Date(Date.now() + this._idCounter * 1000); // Different timestamps
      const post = {
        id: `post-${this._idCounter++}`,
        title: data.title,
        description: data.description,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        authorId: data.authorId,
        createdAt: now,
        updatedAt: now,
        author: include?.author ? this.getMockAuthor(data.authorId) : undefined,
        reactions: include?.reactions
          ? this.getPostReactions(`post-${this._idCounter - 1}`)
          : [],
      };
      this._posts.push(post);
      return post;
    }),

    findMany: jest.fn(async ({ orderBy, include }: any) => {
      const posts = [...this._posts];
      if (orderBy?.createdAt === 'desc') {
        posts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
      return posts.map((post) => ({
        ...post,
        author: include?.author ? this.getMockAuthor(post.authorId) : undefined,
        reactions: include?.reactions ? this.getPostReactions(post.id) : [],
      }));
    }),

    findUnique: jest.fn(async ({ where, include }: any) => {
      const post = this._posts.find((p) => p.id === where.id);
      if (!post) return null;
      return {
        ...post,
        author: include?.author ? this.getMockAuthor(post.authorId) : undefined,
        reactions: include?.reactions ? this.getPostReactions(post.id) : [],
      };
    }),

    update: jest.fn(async ({ where, data, include }: any) => {
      const postIndex = this._posts.findIndex((p) => p.id === where.id);
      if (postIndex === -1) throw new Error('Post not found');

      this._posts[postIndex] = {
        ...this._posts[postIndex],
        ...data,
        updatedAt: new Date(),
      };

      return {
        ...this._posts[postIndex],
        author: include?.author
          ? this.getMockAuthor(this._posts[postIndex].authorId)
          : undefined,
        reactions: include?.reactions ? this.getPostReactions(where.id) : [],
      };
    }),

    delete: jest.fn(async ({ where }: any) => {
      const postIndex = this._posts.findIndex((p) => p.id === where.id);
      if (postIndex === -1) throw new Error('Post not found');
      return this._posts.splice(postIndex, 1)[0];
    }),
  } as any;

  /* ---------------- BlogReaction ---------------- */
  blogReaction = {
    findMany: jest.fn(async ({ where, select }: any) => {
      const filtered = this._reactions.filter((r) => {
        if (where?.userId && r.userId !== where.userId) return false;
        if (where?.postId && r.postId !== where.postId) return false;
        return true;
      });

      if (select) {
        return filtered.map((r) => {
          const result: any = {};
          if (select.postId) result.postId = r.postId;
          if (select.type) result.type = r.type;
          if (select.userId) result.userId = r.userId;
          if (select.id) result.id = r.id;
          if (select.createdAt) result.createdAt = r.createdAt;
          return result;
        });
      }

      return filtered;
    }),

    findUnique: jest.fn(async ({ where }: any) => {
      if (where.postId_userId) {
        return (
          this._reactions.find(
            (r) =>
              r.postId === where.postId_userId.postId &&
              r.userId === where.postId_userId.userId,
          ) || null
        );
      }
      return null;
    }),

    create: jest.fn(async ({ data }: any) => {
      const reaction = {
        id: `reaction-${this._idCounter++}`,
        type: data.type,
        postId: data.postId,
        userId: data.userId,
        createdAt: new Date(),
      };
      this._reactions.push(reaction);
      return reaction;
    }),

    update: jest.fn(async ({ where, data }: any) => {
      const reaction = this._reactions.find((r) => r.id === where.id);
      if (!reaction) throw new Error('Reaction not found');
      Object.assign(reaction, data);
      return reaction;
    }),

    delete: jest.fn(async ({ where }: any) => {
      const reactionIndex = this._reactions.findIndex((r) => r.id === where.id);
      if (reactionIndex === -1) throw new Error('Reaction not found');
      return this._reactions.splice(reactionIndex, 1)[0];
    }),
  } as any;

  /* Helper methods */
  getMockAuthor(authorId: string) {
    const authors = {
      'secretary-1': {
        id: 'secretary-1',
        role: Role.SECRETARY,
        secretaryProfile: { firstName: 'Marie', lastName: 'Dupont' },
        directorProfile: null,
        serviceManagerProfile: null,
      },
      'director-1': {
        id: 'director-1',
        role: Role.DIRECTOR,
        secretaryProfile: null,
        directorProfile: { firstName: 'Jean', lastName: 'Martin' },
        serviceManagerProfile: null,
      },
      'service-manager-1': {
        id: 'service-manager-1',
        role: Role.SERVICE_MANAGER,
        secretaryProfile: null,
        directorProfile: null,
        serviceManagerProfile: { firstName: 'Sophie', lastName: 'Leroy' },
      },
    };
    return authors[authorId] || null;
  }

  getPostReactions(postId: string) {
    return this._reactions.filter((r) => r.postId === postId);
  }
}

/* ------------------------------------------------------------------- */
/*                            AI Service Mock                          */
/* ------------------------------------------------------------------- */
const aiServiceMock = {
  improveMission: jest.fn(async (prompt: string) => {
    return `Amélioration IA: ${prompt}`;
  }),
} as unknown as AiService;

/* ------------------------------------------------------------------- */
/*                                 Tests                               */
/* ------------------------------------------------------------------- */
describe('BlogService', () => {
  let service: BlogService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = new PrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: aiServiceMock },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ------------------------------------------------------------------- */
  /*                          CREATE POST                                */
  /* ------------------------------------------------------------------- */
  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const dto = {
        title: 'Test Post',
        description: 'Test Description',
        mediaUrl: '/uploads/blog/test.jpg',
        mediaType: 'IMAGE' as any,
      };

      const result = await service.createPost(dto, 'secretary-1');

      expect(result).toEqual({
        id: expect.any(String),
        title: 'Test Post',
        description: 'Test Description',
        mediaUrl: '/uploads/blog/test.jpg',
        mediaType: 'IMAGE',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        author: {
          id: 'secretary-1',
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

    it('should create a post with director author', async () => {
      const dto = {
        title: 'Director Post',
        description: 'Director Description',
      };

      const result = await service.createPost(dto, 'director-1');

      expect(result.author).toEqual({
        id: 'director-1',
        firstName: 'Jean',
        lastName: 'Martin',
      });
    });

    it('should create a post with service manager author', async () => {
      const dto = {
        title: 'Service Manager Post',
        description: 'Service Manager Description',
      };

      const result = await service.createPost(dto, 'service-manager-1');

      expect(result.author).toEqual({
        id: 'service-manager-1',
        firstName: 'Sophie',
        lastName: 'Leroy',
      });
    });

    it('should trim title and description', async () => {
      const dto = {
        title: '  Test Post  ',
        description: '  Test Description  ',
      };

      await service.createPost(dto, 'secretary-1');

      expect(prisma.blogPost.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Post',
          description: 'Test Description',
          mediaUrl: undefined,
          mediaType: undefined,
          authorId: 'secretary-1',
        },
        include: expect.any(Object),
      });
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          GET ALL POSTS                              */
  /* ------------------------------------------------------------------- */
  describe('getAllPosts', () => {
    beforeEach(async () => {
      // Create test posts with different timestamps
      await service.createPost(
        {
          title: 'Post 1',
          description: 'Description 1',
        },
        'secretary-1',
      );

      await service.createPost(
        {
          title: 'Post 2',
          description: 'Description 2',
        },
        'director-1',
      );
    });

    it('should return all posts ordered by creation date desc', async () => {
      const result = await service.getAllPosts();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Post 2'); // Most recent first
      expect(result[1].title).toBe('Post 1');
    });

    it('should include user reactions when userId provided', async () => {
      // Get the first post ID from the created posts
      const posts = await service.getAllPosts();
      const firstPostId = posts[1].id; // Post 1 (older)

      // Add a reaction
      prisma._reactions.push({
        id: 'reaction-1',
        type: ReactionType.LIKE,
        postId: firstPostId,
        userId: 'user-1',
        createdAt: new Date(),
      });

      const result = await service.getAllPosts('user-1');

      expect(result[1].userReaction).toBe('LIKE');
    });

    it('should not include user reactions when userId not provided', async () => {
      const result = await service.getAllPosts();

      expect(result[0].userReaction).toBeUndefined();
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          GET POST BY ID                             */
  /* ------------------------------------------------------------------- */
  describe('getPostById', () => {
    let postId: string;

    beforeEach(async () => {
      const post = await service.createPost(
        {
          title: 'Test Post',
          description: 'Test Description',
        },
        'secretary-1',
      );
      postId = post.id;
    });

    it('should return post by id', async () => {
      const result = await service.getPostById(postId);

      expect(result.id).toBe(postId);
      expect(result.title).toBe('Test Post');
    });

    it('should throw NotFoundException when post not found', async () => {
      await expect(service.getPostById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include user reaction when userId provided', async () => {
      // Add a reaction
      prisma._reactions.push({
        id: 'reaction-1',
        type: ReactionType.HEART,
        postId: postId,
        userId: 'user-1',
        createdAt: new Date(),
      });

      const result = await service.getPostById(postId, 'user-1');

      expect(result.userReaction).toBe('HEART');
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          TOGGLE REACTION                            */
  /* ------------------------------------------------------------------- */
  describe('toggleReaction', () => {
    let postId: string;

    beforeEach(async () => {
      const post = await service.createPost(
        {
          title: 'Test Post',
          description: 'Test Description',
        },
        'secretary-1',
      );
      postId = post.id;
    });

    it('should add new reaction', async () => {
      const result = await service.toggleReaction(postId, 'user-1', {
        type: ReactionType.LIKE,
      });

      expect(result).toBeDefined();
      expect(prisma.blogReaction.create).toHaveBeenCalledWith({
        data: {
          type: ReactionType.LIKE,
          postId: postId,
          userId: 'user-1',
        },
      });
    });

    it('should remove existing reaction when same type', async () => {
      // Add existing reaction
      const existingReaction = {
        id: 'reaction-1',
        type: ReactionType.LIKE,
        postId: postId,
        userId: 'user-1',
      };
      prisma._reactions.push(existingReaction);

      const result = await service.toggleReaction(postId, 'user-1', {
        type: ReactionType.LIKE,
      });

      expect(result).toBeDefined();
      expect(prisma.blogReaction.delete).toHaveBeenCalledWith({
        where: { id: 'reaction-1' },
      });
    });

    it('should modify existing reaction when different type', async () => {
      // Add existing reaction
      const existingReaction = {
        id: 'reaction-1',
        type: ReactionType.LIKE,
        postId: postId,
        userId: 'user-1',
      };
      prisma._reactions.push(existingReaction);

      const result = await service.toggleReaction(postId, 'user-1', {
        type: ReactionType.HEART,
      });

      expect(result).toBeDefined();
      expect(prisma.blogReaction.update).toHaveBeenCalledWith({
        where: { id: 'reaction-1' },
        data: { type: ReactionType.HEART },
      });
    });

    it('should throw NotFoundException when post not found', async () => {
      await expect(
        service.toggleReaction('non-existent', 'user-1', {
          type: ReactionType.LIKE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          UPDATE POST                                */
  /* ------------------------------------------------------------------- */
  describe('updatePost', () => {
    let postId: string;

    beforeEach(async () => {
      const post = await service.createPost(
        {
          title: 'Original Title',
          description: 'Original Description',
        },
        'secretary-1',
      );
      postId = post.id;
    });

    it('should allow admin to update any post', async () => {
      const dto = {
        title: 'Updated Title',
        description: 'Updated Description',
        mediaUrl: '/uploads/blog/new.jpg',
        mediaType: 'IMAGE' as any,
      };

      const result = await service.updatePost(
        postId,
        dto,
        Role.ADMIN,
        'admin-1',
      );

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
      expect(result.mediaUrl).toBe('/uploads/blog/new.jpg');
    });

    it('should allow director to update any post', async () => {
      const dto = {
        title: 'Updated Title',
        description: 'Updated Description',
        mediaUrl: '/uploads/blog/new.jpg',
        mediaType: 'IMAGE' as any,
      };

      const result = await service.updatePost(
        postId,
        dto,
        Role.DIRECTOR,
        'director-1',
      );

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
      expect(result.mediaUrl).toBe('/uploads/blog/new.jpg');
    });

    it('should allow secretary to update own post', async () => {
      const dto = {
        title: 'Updated Title',
        description: 'Updated Description',
        mediaUrl: '/uploads/blog/new.jpg',
        mediaType: 'IMAGE' as any,
      };

      const result = await service.updatePost(
        postId,
        dto,
        Role.SECRETARY,
        'secretary-1',
      );

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
      expect(result.mediaUrl).toBe('/uploads/blog/new.jpg');
    });

    it('should allow service manager to update own post', async () => {
      // Create a post by service manager
      const post = await service.createPost(
        {
          title: 'SM Post',
          description: 'SM Description',
        },
        'service-manager-1',
      );

      const dto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const result = await service.updatePost(
        post.id,
        dto,
        Role.SERVICE_MANAGER,
        'service-manager-1',
      );

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
    });

    it('should throw NotFoundException when post not found', async () => {
      const dto = { title: 'Updated', description: 'Updated' };

      await expect(
        service.updatePost('non-existent', dto, Role.SECRETARY, 'secretary-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when secretary tries to update others post', async () => {
      const dto = { title: 'Updated', description: 'Updated' };

      await expect(
        service.updatePost(postId, dto, Role.SECRETARY, 'other-secretary'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when service manager tries to update others post', async () => {
      const dto = { title: 'Updated', description: 'Updated' };

      await expect(
        service.updatePost(
          postId,
          dto,
          Role.SERVICE_MANAGER,
          'service-manager-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          DELETE POST                                */
  /* ------------------------------------------------------------------- */
  describe('deletePost', () => {
    let postId: string;

    beforeEach(async () => {
      const post = await service.createPost(
        {
          title: 'Test Post',
          description: 'Test Description',
        },
        'secretary-1',
      );
      postId = post.id;
    });

    it('should allow admin to delete any post', async () => {
      await expect(
        service.deletePost(postId, Role.ADMIN, 'admin-1'),
      ).resolves.not.toThrow();
    });

    it('should allow director to delete any post', async () => {
      await expect(
        service.deletePost(postId, Role.DIRECTOR, 'director-1'),
      ).resolves.not.toThrow();
    });

    it('should allow secretary to delete own post', async () => {
      await expect(
        service.deletePost(postId, Role.SECRETARY, 'secretary-1'),
      ).resolves.not.toThrow();
    });

    it('should allow service manager to delete own post', async () => {
      // Create a post by service manager
      const post = await service.createPost(
        {
          title: 'SM Post',
          description: 'SM Description',
        },
        'service-manager-1',
      );

      await expect(
        service.deletePost(post.id, Role.SERVICE_MANAGER, 'service-manager-1'),
      ).resolves.not.toThrow();
    });

    it("should not allow secretary to delete other's post", async () => {
      await expect(
        service.deletePost(postId, Role.SECRETARY, 'other-secretary'),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should not allow service manager to delete other's post", async () => {
      await expect(
        service.deletePost(postId, Role.SERVICE_MANAGER, 'service-manager-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not allow parent to delete post', async () => {
      await expect(
        service.deletePost(postId, Role.PARENT, 'parent-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when post not found', async () => {
      await expect(
        service.deletePost('non-existent', Role.DIRECTOR, 'director-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          FORMAT POST RESPONSE                       */
  /* ------------------------------------------------------------------- */
  describe('formatPostResponse', () => {
    it('should format secretary author correctly', async () => {
      const post = await service.createPost(
        {
          title: 'Test Post',
          description: 'Test Description',
        },
        'secretary-1',
      );

      expect(post.author).toEqual({
        id: 'secretary-1',
        firstName: 'Marie',
        lastName: 'Dupont',
      });
    });

    it('should format director author correctly', async () => {
      const post = await service.createPost(
        {
          title: 'Test Post',
          description: 'Test Description',
        },
        'director-1',
      );

      expect(post.author).toEqual({
        id: 'director-1',
        firstName: 'Jean',
        lastName: 'Martin',
      });
    });

    it('should format service manager author correctly', async () => {
      const post = await service.createPost(
        {
          title: 'Test Post',
          description: 'Test Description',
        },
        'service-manager-1',
      );

      expect(post.author).toEqual({
        id: 'service-manager-1',
        firstName: 'Sophie',
        lastName: 'Leroy',
      });
    });

    it('should count reactions correctly', async () => {
      const post = await service.createPost(
        {
          title: 'Test Post',
          description: 'Test Description',
        },
        'secretary-1',
      );

      // Add reactions
      prisma._reactions.push(
        { id: 'r1', type: ReactionType.LIKE, postId: post.id, userId: 'u1' },
        { id: 'r2', type: ReactionType.LIKE, postId: post.id, userId: 'u2' },
        { id: 'r3', type: ReactionType.HEART, postId: post.id, userId: 'u3' },
      );

      const result = await service.getPostById(post.id);

      expect(result.reactions).toEqual({
        LIKE: 2,
        HEART: 1,
        SMILE: 0,
        CLAP: 0,
        PARTY: 0,
      });
    });
  });
});
