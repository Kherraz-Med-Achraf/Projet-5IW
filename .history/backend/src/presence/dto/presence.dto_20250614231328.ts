import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO pour créer une nouvelle feuille de présence
 */
export class CreatePresenceSheetDto {
  @ApiProperty({ description: 'Date de la feuille (YYYY-MM-DD)', format: 'date' })
  @IsDateString()
  date: string;
}

/**
 * DTO pour valider la feuille par l’éducateur
 */
export class ValidateSheetDto {
  @ApiProperty({ description: 'ID du staff qui valide la feuille' })
  @IsNotEmpty()
  staffId: string;
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
