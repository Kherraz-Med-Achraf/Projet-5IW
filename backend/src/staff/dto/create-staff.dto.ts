import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsPhoneNumber,
  IsDateString,
} from 'class-validator';
import { PASSWORD_REGEX } from '../../common/constants/password.regex';
import { Discipline } from '@prisma/client';

export class CreateStaffDto {
  // 1) Infos de connexion
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(12, {
    message: 'Le mot de passe doit contenir au moins 12 caractères',
  })
  @Matches(PASSWORD_REGEX, {
    message:
      'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  password: string;

  // 2) Profil staff
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName: string;

  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR', {
    message: 'Le téléphone doit être un numéro français valide',
  })
  phone: string;

  @IsEnum(Discipline, { message: 'Discipline invalide' })
  discipline: Discipline;

  @IsDateString({}, { message: 'La date de naissance doit être au format ISO' })
  birthDate: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'La spécialité doit être une chaîne de caractères' })
  specialty?: string;
}
