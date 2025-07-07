import { PostMediaType, ReactionType } from '@prisma/client';

export class BlogPostResponseDto {
  id: string;
  title: string;
  description: string;
  mediaUrl?: string;
  mediaType?: PostMediaType;
  createdAt: Date;
  updatedAt: Date;

  // Informations sur l'auteur
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };

  // Statistiques des réactions
  reactions: {
    [key in ReactionType]: number;
  };

  // Réaction de l'utilisateur actuel (si connecté)
  userReaction?: ReactionType;
}
