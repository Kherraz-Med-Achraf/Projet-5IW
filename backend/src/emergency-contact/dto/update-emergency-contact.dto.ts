// src/emergency-contact/dto/update-emergency-contact.dto.ts

import {
  IsOptional,
  IsString,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEmergencyContactDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom complet doit être une chaîne de caractères' })
  @MinLength(2, {
    message: 'Le nom complet doit contenir au moins 2 caractères',
  })
  name?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'La relation doit être une chaîne de caractères' })
  @MinLength(2, { message: 'La relation doit contenir au moins 2 caractères' })
  relation?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR', {
    message: 'Le numéro de téléphone doit être un numéro français valide',
  })
  phone?: string;
}
