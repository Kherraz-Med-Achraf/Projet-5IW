import { IsOptional, IsString, MinLength, IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
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
  @IsPhoneNumber('FR', { message: 'Le téléphone doit être un numéro français valide' })
  phone?: string;
} 