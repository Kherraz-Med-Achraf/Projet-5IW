import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, IsBoolean } from 'class-validator';
import { PostMediaType } from '@prisma/client';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'La description ne peut pas dépasser 2000 caractères' })
  description: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsEnum(PostMediaType)
  mediaType?: PostMediaType;

  @IsOptional()
  @IsBoolean()
  improveTitleWithAI?: boolean;

  @IsOptional()
  @IsBoolean()
  improveDescriptionWithAI?: boolean;
} 