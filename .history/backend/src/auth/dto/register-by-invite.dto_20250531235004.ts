import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterByInviteDto {
  @IsNotEmpty()
  token: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @MinLength(8)
  passwordConfirm: string;

  // Si rôle = PARENT, on peut fournir ces tableaux
  children?: {
    firstName: string;
    lastName: string;
    birthDate: string;
  }[];

  emergencyContacts?: {
    name: string;
    phone: string;
    relation: string;
  }[];
}
