import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  IsInt,
  IsString,
  Length,
  IsOptional
} from 'class-validator';

import { PASSWORD_REGEX } from '../../


export class RegisterDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  password: string;
}

export class LoginDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Le mot de passe ne doit pas être vide' })
  password: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: "Le code OTP doit être une chaîne de caractères" })
  @Length(6, 6, { message: 'Le code OTP doit comporter exactement 6 chiffres' })
  @Matches(/^\d{6}$/, { message: 'Le code OTP doit contenir uniquement des chiffres' })
  otpCode?: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email: string;
}

export class ResetPasswordDto {
  @Type(() => Number)
  @IsInt({ message: 'Le PRID doit être un entier' })
  prid: number;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le token doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le token ne doit pas être vide' })
  token: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nouveau mot de passe doit être une chaîne de caractères' })
  @MinLength(12, { message: 'Le nouveau mot de passe doit contenir au moins 12 caractères' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Le nouveau mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  newPassword: string;
}
