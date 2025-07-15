// src/auth/dto/emergency-contact.dto.ts

import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class EmergencyContactDto {
  @IsString({ message: 'Le nom complet doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom complet est obligatoire' })
  @MinLength(2, {
    message: 'Le nom complet doit contenir au moins 2 caractères',
  })
  name: string;

  @IsString({ message: 'La relation doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La relation est obligatoire' })
  @MinLength(2, { message: 'La relation doit contenir au moins 2 caractères' })
  relation: string;

  @Matches(/^0[67]\d{8}$/, {
    message: 'Le numéro de téléphone doit être un numéro français valide',
  })
  phone: string;
}
