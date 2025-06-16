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
 */
export class JustifyAbsenceDto {
  @ApiProperty({
    description: 'Type de la justification: ABSENCE ou LATENESS',
    enum: JustificationType,
  })
  @IsEnum(JustificationType)
  type: JustificationType;

  @ApiProperty({ description: 'Date du justificatif (YYYY-MM-DD)', format: 'date' })
  @IsDateString()
  justificationDate: string;

  @ApiProperty({ description: 'Motif de l’absence ou du retard' })
  @IsString()
  @IsNotEmpty()
  motif: string;

  // NB : le fichier est récupéré via @UploadedFile() et non via le corps JSON
}
