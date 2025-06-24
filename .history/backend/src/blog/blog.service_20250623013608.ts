import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { BlogPostResponseDto } from './dto/blog-response.dto';
import { Role, ReactionType } from '@prisma/client';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Helper pour récupérer les informations complètes d'un auteur
   */
  private getAuthorInclude() {
    return {
      author: {
        select: {
          id: true,
          role: true,
          secretaryProfile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          directorProfile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          serviceManagerProfile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    };
  }

  /**
   * Créer un nouveau post (Secrétaire, Directeur, Service Manager)
   */
  async createPost(dto: CreateBlogPostDto, authorId: string): Promise<BlogPostResponseDto> {
    const post = await this.prisma.blogPost.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        authorId,
      },
      include: {
        ...this.getAuthorInclude(),
        reactions: true,
      },
    });

    return this.formatPostResponse(post, undefined);
  }

  /**
   * Récupérer tous les posts (ordre chronologique inverse)
   */
  async getAllPosts(userId?: string): Promise<BlogPostResponseDto[]> {
    const posts = await this.prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            secretaryProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        reactions: true,
      },
    });

    // Récupérer les réactions de l'utilisateur si connecté
    let userReactions: { postId: string; type: ReactionType }[] = [];
    if (userId) {
      userReactions = await this.prisma.blogReaction.findMany({
        where: { userId },
        select: { postId: true, type: true },
      });
    }

    return posts.map(post => {
      const userReaction = userReactions.find(r => r.postId === post.id)?.type;
      return this.formatPostResponse(post, userReaction);
    });
  }

  /**
   * Récupérer un post par ID
   */
  async getPostById(postId: string, userId?: string): Promise<BlogPostResponseDto> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            secretaryProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        reactions: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post introuvable');
    }

    let userReaction: ReactionType | undefined;
    if (userId) {
      const reaction = await this.prisma.blogReaction.findUnique({
        where: { postId_userId: { postId, userId } },
      });
      userReaction = reaction?.type;
    }

    return this.formatPostResponse(post, userReaction);
  }

  /**
   * Ajouter ou modifier une réaction
   */
  async toggleReaction(postId: string, userId: string, dto: CreateReactionDto) {
    // Vérifier que le post existe
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post introuvable');
    }

    // Vérifier si l'utilisateur a déjà une réaction
    const existingReaction = await this.prisma.blogReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingReaction) {
      if (existingReaction.type === dto.type) {
        // Supprimer la réaction si c'est la même
        await this.prisma.blogReaction.delete({
          where: { id: existingReaction.id },
        });
        return { message: 'Réaction supprimée' };
      } else {
        // Modifier la réaction
        await this.prisma.blogReaction.update({
          where: { id: existingReaction.id },
          data: { type: dto.type },
        });
        return { message: 'Réaction modifiée' };
      }
    } else {
      // Créer une nouvelle réaction
      await this.prisma.blogReaction.create({
        data: {
          type: dto.type,
          postId,
          userId,
        },
      });
      return { message: 'Réaction ajoutée' };
    }
  }

  /**
   * Modifier un post (Secrétaire auteur uniquement)
   */
  async updatePost(postId: string, dto: CreateBlogPostDto, userId: string): Promise<BlogPostResponseDto> {
    // Vérifier que le post existe et appartient à l'utilisateur
    const existingPost = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, mediaUrl: true },
    });

    if (!existingPost) {
      throw new NotFoundException('Post introuvable');
    }

    if (existingPost.authorId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres posts');
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      title: dto.title.trim(),
      description: dto.description.trim(),
    };

    // Gestion du média
    if (dto.mediaUrl) {
      updateData.mediaUrl = dto.mediaUrl;
      updateData.mediaType = dto.mediaType;
    }

    const updatedPost = await this.prisma.blogPost.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            secretaryProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        reactions: true,
      },
    });

    return this.formatPostResponse(updatedPost, undefined);
  }

  /**
   * Supprimer un post (Secrétaire, Directeur, Service Manager)
   */
  async deletePost(postId: string, userRole: Role, userId: string): Promise<void> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post introuvable');
    }

    // Vérification des permissions
    const canDelete = 
      userRole === Role.DIRECTOR ||
      userRole === Role.SERVICE_MANAGER ||
      (userRole === Role.SECRETARY && post.authorId === userId);

    if (!canDelete) {
      throw new ForbiddenException('Vous n\'avez pas le droit de supprimer ce post');
    }

    // Suppression en cascade (réactions supprimées automatiquement)
    await this.prisma.blogPost.delete({
      where: { id: postId },
    });
  }

  /**
   * Helper pour extraire le nom de l'auteur selon son rôle
   */
  private getAuthorName(author: any): { firstName: string; lastName: string } {
    if (author.secretaryProfile) {
      return {
        firstName: author.secretaryProfile.firstName,
        lastName: author.secretaryProfile.lastName,
      };
    }
    
    if (author.directorProfile) {
      return {
        firstName: author.directorProfile.firstName,
        lastName: author.directorProfile.lastName,
      };
    }
    
    if (author.serviceManagerProfile) {
      return {
        firstName: author.serviceManagerProfile.firstName,
        lastName: author.serviceManagerProfile.lastName,
      };
    }
    
    return {
      firstName: 'Auteur',
      lastName: 'Inconnu',
    };
  }

  /**
   * Formater la réponse d'un post avec les statistiques de réactions
   */
  private formatPostResponse(post: any, userReaction?: ReactionType): BlogPostResponseDto {
    // Compter les réactions par type
    const reactionCounts = {
      LIKE: 0,
      HEART: 0,
      SMILE: 0,
      CLAP: 0,
      PARTY: 0,
    };

    post.reactions.forEach((reaction: any) => {
      reactionCounts[reaction.type]++;
    });

    const authorName = this.getAuthorName(post.author);

    return {
      id: post.id,
      title: post.title,
      description: post.description,
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        id: post.author.id,
        firstName: authorName.firstName,
        lastName: authorName.lastName,
      },
      reactions: reactionCounts,
      userReaction,
    };
  }
} 