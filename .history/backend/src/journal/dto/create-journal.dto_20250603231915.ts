// src/journal/dto/create-journal.dto.ts

import { IsInt, IsOptional, IsString, IsObject } from 'class-validator';

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

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsObject()
  progressionMissions?: Record<string, any>;
}
