// src/presence/dto/presence.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum JustificationType {
  ABSENCE = 'ABSENCE',
  LATENESS = 'LATENESS',
}

/**
 * DTO pour justifier une absence ou un retard par la secrétaire.
 * - Si type = ABSENCE : motif **et** fichier obligatoires.
 * - Si type = LATENESS : motif et fichier **facultatifs**.
 */
export class JustifyAbsenceDto {
  @ApiProperty({
    description: 'Type de la justification : ABSENCE ou LATENESS',
    enum: JustificationType,
  })
  @IsEnum(JustificationType)
  type: JustificationType;

  @ApiProperty({ description: 'Date du justificatif (YYYY-MM-DD)', format: 'date' })
  @IsDateString()
  justificationDate: string;

  @ApiProperty({
    description: 'Motif de l’absence (obligatoire si ABSENCE)',
    required: false,
  })
  @ValidateIf(o => o.type === JustificationType.ABSENCE)
  @IsString()
  @IsNotEmpty({ message: 'Le motif est obligatoire pour une absence.' })
  motif?: string;

  @ApiProperty({
    description: 'Fichier justificatif (PDF/JPG), requis uniquement pour ABSENCE',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @ValidateIf(o => o.type === JustificationType.ABSENCE)
  @IsNotEmpty({ message: 'Le fichier est obligatoire pour une absence.' })
  file: any;
}
