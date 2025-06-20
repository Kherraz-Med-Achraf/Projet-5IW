import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';
import { PASSWORD_REGEX } from '../../common/constants/pasword.regex';

export class RegisterByInviteDto {
  @IsNotEmpty()
  token: string;

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

  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(12, { message: 'La confirmation doit contenir au moins 12 caractères' })
  passwordConfirm: string;

  // → Informations du ParentProfile
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Le prénom ne doit pas être vide' })
  firstName: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Le nom de famille ne doit pas être vide' })
  lastName: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone ne doit pas être vide' })
  phone: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: "L'adresse ne doit pas être vide" })
  address: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'La responsabilité légale ne doit pas être vide' })
  legalResponsibility: string;

  // Si rôle = PARENT, on peut fournir ces tableaux (facultatif)
  @IsOptional()
  children?: {
    firstName: string;
    lastName: string;
    birthDate: string; // format ISO string
  }[];

  @IsOptional()
  emergencyContacts?: {
    name: string;
    phone: string;
    relation: string;
  }[];
}
