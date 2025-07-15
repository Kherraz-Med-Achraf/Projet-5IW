// src/journal/dto/reopen-journal.dto.ts

import { IsString } from 'class-validator';

/**
 * DTO pour réouvrir un journal déjà soumis.
 * Seul ADMIN peut appeler cette route.
 */
export class ReopenJournalDto {
  @IsString()
  reason: string;
}
