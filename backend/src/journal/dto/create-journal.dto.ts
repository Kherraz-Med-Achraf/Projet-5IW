// src/journal/dto/create-journal.dto.ts

import { IsInt, IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

/**
 * DTO pour la création d’un nouveau journal (brouillon).
 * Seuls STAFF et ADMIN peuvent appeler cette route.
 */
export class CreateJournalDto {
  @IsInt()
  childId: number;

  @IsInt()
  academicYearId: number;

  @IsInt()
  month: number;

  @IsString()
  @IsNotEmpty({ message: 'Le champ contenu ne peut pas être vide.' })
  contenu: string;

  @IsOptional()
  @IsObject()
  progressionMissions?: Record<string, any>;
}
