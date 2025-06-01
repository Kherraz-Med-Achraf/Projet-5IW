

import { Transform } from 'class-transformer';
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

export class CreateServiceManagerDto {
  /** 1) Infos de connexion */
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  password: string;

  /** 2) Profil chef de service */
  @IsString({ message: 'Le poste doit être une chaîne de caractères' })
  jobTitle: string;

  @IsDateString({}, { message: 'La date de début doit être au format ISO' })
  startDate: string;

  @IsOptional()
  @IsUrl({}, { message: 'Doit être une URL valide' })
  profileImage?: string;

  /** 3) Données personnelles */
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2)
  firstName: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2)
  lastName: string;

  @IsDateString({}, { message: 'La date de naissance doit être au format ISO' })
  birthDate: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le téléphone doit être une chaîne' })
  @MinLength(10, { message: 'Le téléphone doit contenir au moins 10 caractères' })
  phone: string;
}
