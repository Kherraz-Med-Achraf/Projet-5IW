// src/service-manager/dto/update-service-manager.dto.ts
import { IsOptional, IsString, MinLength, IsUrl, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateServiceManagerDto {
  @IsOptional()
  @IsString({ message: 'Le poste doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le poste doit contenir au moins 2 caractères' })
  jobTitle?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début doit être au format ISO' })
  startDate?: string;

  @IsOptional()
  @IsUrl({}, { message: 'L’URL de l’image de profil doit être valide' })
  profileImage?: string;

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
  @IsDateString({}, { message: 'La date de naissance doit être au format ISO' })
  birthDate?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @MinLength(10, { message: 'Le téléphone doit contenir au moins 10 caractères' })
  phone?: string;
}
