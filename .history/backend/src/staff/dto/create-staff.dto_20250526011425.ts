// src/staff/dto/create-staff.dto.ts
import { Transform } from 'class-transformer';
import {
  IsEmail, IsString, MinLength, Matches,
  IsEnum, IsOptional
} from 'class-validator';
import { PASSWORD_REGEX } from '../../common/constants/pasword.regex';
import { Discipline } from '@prisma/client';

export class CreateStaffDto {
  // 1) les infos de connexion
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

  // 2) le profil staff
  @IsEnum(Discipline, { message: 'Discipline invalide' })
  discipline: Discipline;

  @IsOptional()
  @IsString({ message: 'La spécialité doit être une chaîne de caractères' })
  specialty?: string;
}
