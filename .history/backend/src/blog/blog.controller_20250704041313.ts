import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { FileValidationService } from '../common/services/file-validation.service';

// Configuration multer pour upload de fichiers
const storage = diskStorage({
  destination: './uploads/blog',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Types de fichiers autorisés avec validation stricte
  const allowedExtensions = ['jpeg', 'jpg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webm'];
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
  ];

  const ext = extname(file.originalname).toLowerCase().substring(1);
  const isValidExtension = allowedExtensions.includes(ext);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

  // Validation stricte : extension ET mimetype doivent correspondre
  const isImageWithValidMime = 
    ['jpeg', 'jpg', 'png', 'gif'].includes(ext) && 
    file.mimetype.startsWith('image/');
  
  const isVideoWithValidMime = 
    ['mp4', 'mov', 'avi', 'webm'].includes(ext) && 
    file.mimetype.startsWith('video/');

  if (isValidExtension && isValidMimeType && (isImageWithValidMime || isVideoWithValidMime)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Type de fichier non autorisé ou incohérent'), false);
  }
};

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /**
   * Créer un nouveau post (Admin, Secrétaire, Directeur, Service Manager)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @Post()
  @UseInterceptors(
    FileInterceptor('media', {
      storage,
      fileFilter,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    })
  )
  async createPost(
    @Body() dto: CreateBlogPostDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    
    // Si un fichier est uploadé, on met à jour les données
    if (file) {
      dto.mediaUrl = `/uploads/blog/${file.filename}`;
      
      // Déterminer le type de média basé sur le mimetype
      if (file.mimetype.startsWith('image/')) {
        dto.mediaType = 'IMAGE';
      } else if (file.mimetype.startsWith('video/')) {
        dto.mediaType = 'VIDEO';
      }
    }

    return this.blogService.createPost(dto, user.id);
  }

  /**
   * Récupérer tous les posts (accessible à tous les utilisateurs connectés)
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllPosts(@Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    return this.blogService.getAllPosts(user?.id);
  }

  /**
   * Récupérer un post par ID
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPostById(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    return this.blogService.getPostById(id, user?.id);
  }

  /**
   * Ajouter/modifier une réaction (Parents et autres utilisateurs connectés)
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/reactions')
  async toggleReaction(
    @Param('id') postId: string,
    @Body() dto: CreateReactionDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.blogService.toggleReaction(postId, user.id, dto);
  }

  /**
   * Modifier un post (Admin et Directeur peuvent modifier tous les posts, autres seulement les leurs)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @Put(':id')
  @UseInterceptors(
    FileInterceptor('media', {
      storage,
      fileFilter,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    })
  )
  async updatePost(
    @Param('id') id: string,
    @Body() dto: CreateBlogPostDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string; role: Role };
    
    // Si un fichier est uploadé, on met à jour les données
    if (file) {
      dto.mediaUrl = `/uploads/blog/${file.filename}`;
      
      // Déterminer le type de média basé sur le mimetype
      if (file.mimetype.startsWith('image/')) {
        dto.mediaType = 'IMAGE';
      } else if (file.mimetype.startsWith('video/')) {
        dto.mediaType = 'VIDEO';
      }
    }

    return this.blogService.updatePost(id, dto, user.role, user.id);
  }

  /**
   * Supprimer un post (Admin et Directeur peuvent supprimer tous les posts, autres seulement les leurs)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY, Role.DIRECTOR, Role.SERVICE_MANAGER)
  @Delete(':id')
  async deletePost(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string; role: Role };
    await this.blogService.deletePost(id, user.role, user.id);
    return { message: 'Post supprimé avec succès' };
  }
} 