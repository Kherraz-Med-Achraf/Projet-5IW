// src/journal/dto/create-mission.dto.ts

import { IsInt, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO pour créer ou mettre à jour une mission.
 */
export class CreateMissionDto {
  @IsString()
  @IsNotEmpty({ message: 'La description ne peut pas être vide.' })
  description: string;

  @IsInt()
  childId: number;

  @IsInt()
  academicYearId: number;
}
