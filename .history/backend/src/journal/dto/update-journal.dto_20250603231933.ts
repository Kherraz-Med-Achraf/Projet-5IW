// src/journal/dto/update-journal.dto.ts

import { IsString, IsObject } from 'class-validator';

/**
 * DTO pour la mise à jour d’un brouillon existant.
 * Seul ADMIN peut appeler cette route.
 */
export class UpdateJournalDto {
  @IsString()
  contenu: string;

  @IsObject()
  progressionMissions: Record<string, any>;
}
