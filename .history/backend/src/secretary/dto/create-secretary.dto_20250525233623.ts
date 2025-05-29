// src/secretary/dto/create-secretary.dto.ts
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsDateString,
  IsPhoneNumber,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { PASSWORD_REGEX } from '../../common/constants/pasword.regex';

export class CreateSecretaryDto {
  /* 1) Infos de connexion */
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse e-mail doit être valide" })
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
  @IsString({ message: 'La spécialité doit être une chaîne de caractères' })
  specialty: string;

  @IsDateString({ message: 'La date de début doit être au format ISO' })
  startDate: string;

  @IsOptional()
  @IsUrl({}, { message: 'Doit être une URL valide' })
  profileImage?: string;

  /* 3) Infos personnelles */
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName: string;

  @IsDateString({ message: 'La date de naissance doit être au format ISO' })
  birthDate: string;

  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR', { strictMode: false, message: 'Le téléphone doit être un numéro français valide' })
  phone: string;
}
