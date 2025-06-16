// src/presence/dto/presence.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';

/**
 * Pour indiquer si la justification est une absence ou un retard.
 */
export enum JustificationType {
  ABSENCE = 'ABSENCE',
  LATENESS = 'LATENESS',
}

/**
 * DTO pour créer ou récupérer une feuille de présence.
 */
export class CreatePresenceSheetDto {
  @ApiProperty({ description: 'Date de la feuille (YYYY-MM-DD)', format: 'date' })
  @IsDateString()
  date: string;
}

/**
 * DTO pour valider la feuille par l’éducateur.
 * On ne passe plus le staffId ici (récupéré depuis req.user),
 * mais on fournit la liste des enfants présents.
 */
export class ValidateSheetDto {
  @ApiProperty({
    description: 'Tableau des IDs des enfants présents',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  presentChildIds: number[];
}

/**
 * DTO pour justifier une absence ou un retard par la secrétaire.
 * - Si type = ABSENCE : motif et éventuel fichier obligatoires.
 * - Si type = LATENESS : motif et fichier non requis.
 */
export class JustifyAbsenceDto {
  @ApiProperty({
    description: 'Type de la justification : ABSENCE ou LATENESS',
    enum: Object.values(JustificationType),
    enumName: 'JustificationType',
  })
  @IsEnum(JustificationType)
  type: JustificationType;

  @ApiProperty({ description: 'Date du justificatif (YYYY-MM-DD)', format: 'date' })
  @IsDateString()
  justificationDate: string;

  @ApiProperty({
    description: 'Motif de l’absence (obligatoire si ABSENCE, facultatif si LATENESS)',
    required: false,
  })
  @ValidateIf(o => o.type === JustificationType.ABSENCE)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  motif?: string;

  @ApiProperty({
    description: 'Fichier justificatif (PDF/JPG), requis uniquement pour ABSENCE',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @ValidateIf(o => o.type === JustificationType.ABSENCE)
  @IsOptional()
  file?: any;
}
