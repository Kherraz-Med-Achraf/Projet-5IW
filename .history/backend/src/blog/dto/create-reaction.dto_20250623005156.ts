import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionType } from '@prisma/client';

export class CreateReactionDto {
  @IsEnum(ReactionType)
  @IsNotEmpty()
  type: ReactionType;
} 