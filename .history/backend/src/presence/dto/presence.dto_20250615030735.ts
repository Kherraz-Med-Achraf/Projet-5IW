// src/presence/dto/presence.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { JustificationType } from '@prisma/client';  // or wherever it lives

export class JustifyAbsenceDto {
  @ApiProperty({
    description: 'Type de justification',
    enum: Object.values(JustificationType),     // <<–– array of values
    enumName: 'JustificationType',
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

  @ApiProperty({
    description: 'Fichier justificatif (PDF/JPG), facultatif',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  file?: any;
}
