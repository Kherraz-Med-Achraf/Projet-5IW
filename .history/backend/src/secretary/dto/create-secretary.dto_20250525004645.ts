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
import { PASSWORD_REGEX } from '../../common/constants/password.regex';

export class CreateSecretaryDto {
  /* 1) Infos de connexion */
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(12)
  @Matches(PASSWORD_REGEX)
  password: string;

  /* 2) Profil secrétaire */
  @IsString()
  jobTitle: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsUrl({}, { message: 'Doit être une URL valide' })
  profileImage?: string;
}
