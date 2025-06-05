// src/journal/dto/update-journal.dto.ts

import { IsString, IsNotEmpty, IsObject } from 'class-validator';

/**
 * DTO pour la mise à jour d’un brouillon existant.
 * Seul ADMIN peut appeler cette route.
 */
export class UpdateJournalDto {
  @IsString()
  @IsNotEmpty({ message: 'Le champ contenu ne peut pas être vide.' })
  contenu: string;

  @IsObject()
  progressionMissions: Record<string, any>;
}
