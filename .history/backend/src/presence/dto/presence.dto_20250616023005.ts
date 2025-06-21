import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsArray, ArrayNotEmpty, ArrayUnique } from 'class-validator';

/**
 * DTO pour créer ou récupérer une feuille de présence
 */
export class CreatePresenceSheetDto {
  @ApiProperty({ description: 'Date de la feuille (YYYY-MM-DD)', format: 'date' })
  @IsDateString()
  date: string;
}

/**
 * DTO pour valider la feuille par l’éducateur
 * On ne passe plus le staffId ici (récupéré depuis req.user),
 * mais on fournit la liste des enfants présents.
 */
export class ValidateSheetDto {
  @ApiProperty({ description: 'Tableau des IDs des enfants présents', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  presentChildIds: number[];
}

/**
 * DTO pour justifier une absence par la secrétaire
 */
export class JustifyAbsenceDto {
  @ApiProperty({ description: 'Date du justificatif (YYYY-MM-DD)', format: 'date' })
  @IsDateString()
  justificationDate: string;

  @ApiProperty({ description: 'Motif de l’absence ou du retard' })
  @IsString()
  @IsNotEmpty()
  motif: string;

  @ApiProperty({
    description: 'Fichier justificatif (PDF/JPG)',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  file?: any;
}
