import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentCategory, DocumentStatus, SignatureStatus } from '@prisma/client';

/**
 * DTO pour créer un nouveau document
 */
export class CreateDocumentDto {
  @ApiProperty({
    description: 'Titre du document',
    example: 'Règlement intérieur 2024',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Description du document',
    example: 'Nouveau règlement intérieur pour l\'année scolaire 2024-2025',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Catégorie du document',
    enum: DocumentCategory,
    example: DocumentCategory.INFORMATIONS_GENERALES,
  })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiProperty({
    description: 'Le document nécessite-t-il une signature ?',
    example: true,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  requiresSignature: boolean;

  @ApiProperty({
    description: 'IDs des parents qui auront accès au document',
    type: [Number],
    example: [1, 2, 3],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Si ce n'est pas du JSON valide, essayer de le traiter comme un seul ID
        const num = parseInt(value, 10);
        return isNaN(num) ? [] : [num];
      }
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  parentIds: number[];
}

/**
 * DTO pour mettre à jour un document
 */
export class UpdateDocumentDto {
  @ApiPropertyOptional({
    description: 'Titre du document',
    example: 'Règlement intérieur 2024 - Version mise à jour',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description du document',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Catégorie du document',
    enum: DocumentCategory,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({
    description: 'Statut du document',
    enum: DocumentStatus,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}

/**
 * DTO pour publier un document
 */
export class PublishDocumentDto {
  @ApiProperty({
    description: 'IDs des parents qui auront accès au document',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  parentIds: number[];
}

/**
 * DTO pour initier une signature
 */
export class InitiateSignatureDto {
  @ApiProperty({
    description: 'ID du document à faire signer',
    example: 'clm123abc',
  })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({
    description: 'IDs des parents qui doivent signer',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  parentIds: number[];

  @ApiPropertyOptional({
    description: 'Message personnalisé pour les signataires',
    example: 'Merci de signer ce document avant le 31 décembre.',
  })
  @IsOptional()
  @IsString()
  customMessage?: string;
}

/**
 * DTO pour les filtres de recherche
 */
export class DocumentFiltersDto {
  @ApiPropertyOptional({
    description: 'Catégorie du document',
    enum: DocumentCategory,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({
    description: 'Statut du document',
    enum: DocumentStatus,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({
    description: 'Documents nécessitant une signature uniquement',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  requiresSignature?: boolean;

  @ApiPropertyOptional({
    description: 'Recherche par titre',
    example: 'règlement',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Nombre d\'éléments par page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Décalage pour la pagination',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

/**
 * DTO pour les réponses avec métadonnées
 */
export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ enum: DocumentCategory })
  category: DocumentCategory;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  filesize: number;

  @ApiProperty()
  mimetype: string;

  @ApiProperty()
  requiresSignature: boolean;

  @ApiProperty()
  version: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  publishedAt?: Date;

  @ApiProperty()
  uploadedBy: {
    id: string;
    email: string;
    secretaryProfile?: {
      firstName: string;
      lastName: string;
    };
  };
}

/**
 * DTO pour les KPIs directeur/service manager
 */
export class DocumentKPIsDto {
  @ApiProperty()
  totalDocuments: number;

  @ApiProperty()
  publishedDocuments: number;

  @ApiProperty()
  documentsRequiringSignature: number;

  @ApiProperty()
  pendingSignatures: number;

  @ApiProperty()
  completedSignatures: number;

  @ApiProperty()
  signatureRate: number; // Pourcentage de signatures complétées

  @ApiProperty()
  averageSignatureTime: number; // Temps moyen en heures

  @ApiProperty()
  documentsByCategory: Record<DocumentCategory, number>;

  @ApiProperty()
  recentActivity: {
    documentsUploadedThisWeek: number;
    signaturesCompletedThisWeek: number;
    activeReminders: number;
  };
} 