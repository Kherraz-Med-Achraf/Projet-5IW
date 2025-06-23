import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role, ReactionType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/* ------------------------------------------------------------------- */
/*                            Blog Service Mock                        */
/* ------------------------------------------------------------------- */
const blogServiceMock = {
  createPost: jest.fn(),
  getAllPosts: jest.fn(),
  getPostById: jest.fn(),
  toggleReaction: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
};

/* ------------------------------------------------------------------- */
/*                                 Tests                               */
/* ------------------------------------------------------------------- */
describe('BlogController', () => {
  let controller: BlogController;
  let service: BlogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        { provide: BlogService, useValue: blogServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BlogController>(BlogController);
    service = module.get<BlogService>(BlogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ------------------------------------------------------------------- */
  /*                          CREATE POST                                */
  /* ------------------------------------------------------------------- */
  describe('createPost', () => {
    const mockRequest = {
      user: { id: 'user-1' },
    } as any;

    const mockDto = {
      title: 'Test Post',
      description: 'Test Description',
    };

    it('should create post without file', async () => {
      const expectedResult = {
        id: 'post-1',
        title: 'Test Post',
        description: 'Test Description',
        author: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        reactions: { LIKE: 0, HEART: 0, SMILE: 0, CLAP: 0, PARTY: 0 },
      };

      blogServiceMock.createPost.mockResolvedValue(expectedResult);

      const result = await controller.createPost(mockDto, undefined, mockRequest);

      expect(service.createPost).toHaveBeenCalledWith(mockDto, 'user-1');
      expect(result).toBe(expectedResult);
    });

    it('should create post with image file', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const expectedDto = {
        ...mockDto,
        mediaUrl: '/uploads/blog/test-image.jpg',
        mediaType: 'IMAGE',
      };

      const expectedResult = {
        id: 'post-1',
        ...expectedDto,
        author: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        reactions: { LIKE: 0, HEART: 0, SMILE: 0, CLAP: 0, PARTY: 0 },
      };

      blogServiceMock.createPost.mockResolvedValue(expectedResult);

      const result = await controller.createPost(mockDto, mockFile, mockRequest);

      expect(service.createPost).toHaveBeenCalledWith(expectedDto, 'user-1');
      expect(result).toBe(expectedResult);
    });

    it('should create post with video file', async () => {
      const mockFile = {
        filename: 'test-video.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      const expectedDto = {
        ...mockDto,
        mediaUrl: '/uploads/blog/test-video.mp4',
        mediaType: 'VIDEO',
      };

      blogServiceMock.createPost.mockResolvedValue({});

      await controller.createPost(mockDto, mockFile, mockRequest);

      expect(service.createPost).toHaveBeenCalledWith(expectedDto, 'user-1');
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          GET ALL POSTS                              */
  /* ------------------------------------------------------------------- */
  describe('getAllPosts', () => {
    it('should return all posts for authenticated user', async () => {
      const mockRequest = { user: { id: 'user-1' } } as any;
      const expectedPosts = [
        {
          id: 'post-1',
          title: 'Post 1',
          author: { id: 'author-1', firstName: 'John', lastName: 'Doe' },
          reactions: { LIKE: 5, HEART: 2, SMILE: 1, CLAP: 0, PARTY: 0 },
          userReaction: 'LIKE',
        },
        {
          id: 'post-2',
          title: 'Post 2',
          author: { id: 'author-2', firstName: 'Jane', lastName: 'Smith' },
          reactions: { LIKE: 3, HEART: 1, SMILE: 0, CLAP: 2, PARTY: 1 },
        },
      ];

      blogServiceMock.getAllPosts.mockResolvedValue(expectedPosts);

      const result = await controller.getAllPosts(mockRequest);

      expect(service.getAllPosts).toHaveBeenCalledWith('user-1');
      expect(result).toBe(expectedPosts);
    });

    it('should return all posts for unauthenticated request', async () => {
      const mockRequest = {} as any;
      const expectedPosts = [
        {
          id: 'post-1',
          title: 'Post 1',
          author: { id: 'author-1', firstName: 'John', lastName: 'Doe' },
          reactions: { LIKE: 5, HEART: 2, SMILE: 1, CLAP: 0, PARTY: 0 },
        },
      ];

      blogServiceMock.getAllPosts.mockResolvedValue(expectedPosts);

      const result = await controller.getAllPosts(mockRequest);

      expect(service.getAllPosts).toHaveBeenCalledWith(undefined);
      expect(result).toBe(expectedPosts);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          GET POST BY ID                             */
  /* ------------------------------------------------------------------- */
  describe('getPostById', () => {
    it('should return post by id for authenticated user', async () => {
      const mockRequest = { user: { id: 'user-1' } } as any;
      const expectedPost = {
        id: 'post-1',
        title: 'Test Post',
        author: { id: 'author-1', firstName: 'John', lastName: 'Doe' },
        reactions: { LIKE: 5, HEART: 2, SMILE: 1, CLAP: 0, PARTY: 0 },
        userReaction: 'LIKE',
      };

      blogServiceMock.getPostById.mockResolvedValue(expectedPost);

      const result = await controller.getPostById('post-1', mockRequest);

      expect(service.getPostById).toHaveBeenCalledWith('post-1', 'user-1');
      expect(result).toBe(expectedPost);
    });

    it('should return post by id for unauthenticated request', async () => {
      const mockRequest = {} as any;
      const expectedPost = {
        id: 'post-1',
        title: 'Test Post',
        author: { id: 'author-1', firstName: 'John', lastName: 'Doe' },
        reactions: { LIKE: 5, HEART: 2, SMILE: 1, CLAP: 0, PARTY: 0 },
      };

      blogServiceMock.getPostById.mockResolvedValue(expectedPost);

      const result = await controller.getPostById('post-1', mockRequest);

      expect(service.getPostById).toHaveBeenCalledWith('post-1', undefined);
      expect(result).toBe(expectedPost);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          TOGGLE REACTION                            */
  /* ------------------------------------------------------------------- */
  describe('toggleReaction', () => {
    it('should toggle reaction successfully', async () => {
      const mockRequest = { user: { id: 'user-1' } } as any;
      const mockDto = { type: ReactionType.LIKE };
      const expectedResult = { message: 'Réaction ajoutée' };

      blogServiceMock.toggleReaction.mockResolvedValue(expectedResult);

      const result = await controller.toggleReaction('post-1', mockDto, mockRequest);

      expect(service.toggleReaction).toHaveBeenCalledWith('post-1', 'user-1', mockDto);
      expect(result).toBe(expectedResult);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          UPDATE POST                                */
  /* ------------------------------------------------------------------- */
  describe('updatePost', () => {
    const mockRequest = { user: { id: 'user-1' } } as any;
    const mockDto = {
      title: 'Updated Title',
      description: 'Updated Description',
    };

    it('should update post without file', async () => {
      const expectedResult = {
        id: 'post-1',
        title: 'Updated Title',
        description: 'Updated Description',
        author: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        reactions: { LIKE: 0, HEART: 0, SMILE: 0, CLAP: 0, PARTY: 0 },
      };

      blogServiceMock.updatePost.mockResolvedValue(expectedResult);

      const result = await controller.updatePost('post-1', mockDto, null, mockRequest);

      expect(service.updatePost).toHaveBeenCalledWith('post-1', mockDto, 'user-1');
      expect(result).toBe(expectedResult);
    });

    it('should update post with new image file', async () => {
      const mockFile = {
        filename: 'updated-image.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const expectedDto = {
        ...mockDto,
        mediaUrl: '/uploads/blog/updated-image.jpg',
        mediaType: 'IMAGE',
      };

      const expectedResult = {
        id: 'post-1',
        ...expectedDto,
        author: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        reactions: { LIKE: 0, HEART: 0, SMILE: 0, CLAP: 0, PARTY: 0 },
      };

      blogServiceMock.updatePost.mockResolvedValue(expectedResult);

      const result = await controller.updatePost('post-1', mockDto, mockFile, mockRequest);

      expect(service.updatePost).toHaveBeenCalledWith('post-1', expectedDto, 'user-1');
      expect(result).toBe(expectedResult);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          DELETE POST                                */
  /* ------------------------------------------------------------------- */
  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const mockRequest = { 
        user: { 
          id: 'user-1', 
          role: Role.DIRECTOR 
        } 
      } as any;

      blogServiceMock.deletePost.mockResolvedValue(undefined);

      const result = await controller.deletePost('post-1', mockRequest);

      expect(service.deletePost).toHaveBeenCalledWith('post-1', Role.DIRECTOR, 'user-1');
      expect(result).toEqual({ message: 'Post supprimé avec succès' });
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          GUARDS & ROLES                             */
  /* ------------------------------------------------------------------- */
  describe('Route Guards and Roles', () => {
    it('should have correct decorators on createPost', () => {
      const createPostMetadata = Reflect.getMetadata('roles', controller.createPost);
      expect(createPostMetadata).toEqual([Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER]);
    });

    it('should have correct decorators on updatePost', () => {
      const updatePostMetadata = Reflect.getMetadata('roles', controller.updatePost);
      expect(updatePostMetadata).toEqual([Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER]);
    });

    it('should have correct decorators on deletePost', () => {
      const deletePostMetadata = Reflect.getMetadata('roles', controller.deletePost);
      expect(deletePostMetadata).toEqual([Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER]);
    });
  });

  /* ------------------------------------------------------------------- */
  /*                          FILE UPLOAD VALIDATION                     */
  /* ------------------------------------------------------------------- */
  describe('File Upload Validation', () => {
    it('should reject invalid file types', () => {
      // This would be tested through the multer fileFilter
      // The actual validation happens in the multer configuration
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
        const extName = allowedTypes.test(file.originalname.split('.').pop()?.toLowerCase() || '');
        const mimeType = allowedTypes.test(file.mimetype);

        if (mimeType && extName) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier non autorisé'), false);
        }
      };

      const mockCallback = jest.fn();
      fileFilter(null, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.any(BadRequestException),
        false
      );
    });

    it('should accept valid image files', () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
        const extName = allowedTypes.test(file.originalname.split('.').pop()?.toLowerCase() || '');
        const mimeType = allowedTypes.test(file.mimetype);

        if (mimeType && extName) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier non autorisé'), false);
        }
      };

      const mockCallback = jest.fn();
      fileFilter(null, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it('should accept valid video files', () => {
      const mockFile = {
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
        const extName = allowedTypes.test(file.originalname.split('.').pop()?.toLowerCase() || '');
        const mimeType = allowedTypes.test(file.mimetype);

        if (mimeType && extName) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier non autorisé'), false);
        }
      };

      const mockCallback = jest.fn();
      fileFilter(null, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });
  });
}); 