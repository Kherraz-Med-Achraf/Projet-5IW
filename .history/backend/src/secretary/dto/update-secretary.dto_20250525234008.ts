// src/secretary/dto/update-secretary.dto.ts
import {
    IsString,
    IsDateString,
    IsOptional,
    IsUrl,
    IsPhoneNumber,
  } from 'class-validator';
  
  export class UpdateSecretaryDto {
    @IsOptional()
    @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
    firstName?: string;
  
    @IsOptional()
    @IsString({ message: 'Le nom doit être une chaîne de caractères' })
    lastName?: string;
  
    @IsOptional()
    @IsDateString({}, { message: 'La date de naissance doit être au format ISO' })
    birthDate?: string;
  
    @IsOptional()
    @IsPhoneNumber('FR', {}, { message: 'Le numéro de téléphone doit être un numéro français valide' })
    phone?: string;
  
    @IsOptional()
    @IsString({ message: 'La spécialité doit être une chaîne de caractères' })
    specialty?: string;
  
    @IsOptional()
    @IsDateString({}, { message: 'La date de début doit être au format ISO' })
    startDate?: string;
  
    @IsOptional()
    @IsUrl({}, { message: 'Doit être une URL valide' })
    profileImage?: string;
  }
  