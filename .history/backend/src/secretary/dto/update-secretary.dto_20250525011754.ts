import { IsOptional, IsString, IsDateString, IsUrl, IsPhoneNumber } from 'class-validator';

export class UpdateSecretaryDto {
  /* mise à jour des infos personnelles */
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Le nom de famille doit être une chaîne de caractères' })
  lastName?: string;

  @IsOptional()
  @IsDateString({ message: 'La date de naissance doit être au format ISO' })
  birthDate?: string;

  @IsOptional()
  @IsPhoneNumber('FR', { message: 'Le numéro de téléphone doit être un numéro français valide' })
  phone?: string;

  /* mise à jour du poste */
  @IsOptional()
  @IsString({ message: 'Le poste doit être une chaîne de caractères' })
  jobTitle?: string;

  @IsOptional()
  @IsDateString({ message: 'La date de début doit être au format ISO' })
  startDate?: string;

  @IsOptional()
  @IsUrl({ message: 'Doit être une URL valide' })
  profileImage?: string;
}
