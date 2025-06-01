// src/secretary/dto/create-secretary.dto.ts
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsDateString,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { PASSWORD_REGEX } from '../../common/constants/pasword.regex';

export class CreateSecretaryDto {
  /* 1) Infos de connexion */
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  password: string;

  /* 2) Profil secrétaire */
  @IsString({ message: 'Le poste doit être une chaîne de caractères' })
  jobTitle: string;

  @IsDateString({}, { message: 'La date de début doit être au format ISO' })
  startDate: string;

  @IsOptional()
  @IsUrl({}, { message: 'Doit être une URL valide' })
  profileImage?: string;
}
