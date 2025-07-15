import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/u, {
    message:
      "Le prénom ne peut contenir que des lettres, espaces, traits d'union et apostrophes",
  })
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/u, {
    message:
      "Le nom ne peut contenir que des lettres, espaces, traits d'union et apostrophes",
  })
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsPhoneNumber('FR', {
    message: 'Le téléphone doit être un numéro français valide',
  })
  phone?: string;
}
