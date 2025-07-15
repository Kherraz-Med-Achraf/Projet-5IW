// src/journal/dto/reopen-journal.dto.ts

import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO pour réouvrir un journal déjà soumis.
 * Seul ADMIN peut appeler cette route.
 */
export class ReopenJournalDto {
  @IsString()
  @IsNotEmpty({ message: 'Le motif de réouverture ne peut pas être vide.' })
  reason: string;
}
