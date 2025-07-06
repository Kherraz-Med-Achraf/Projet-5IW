import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsString,
  MinLength,
  IsPhoneNumber,
  IsDateString,
} from 'class-validator';
import { Discipline } from '@prisma/client';

export class UpdateStaffDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR', {
    message: 'Le téléphone doit être un numéro français valide',
  })
  phone?: string;

  @IsOptional()
  @IsEnum(Discipline, { message: 'Discipline invalide' })
  discipline?: Discipline;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début doit être au format ISO' })
  birthDate?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'La spécialité doit être une chaîne de caractères' })
  specialty?: string;
}
