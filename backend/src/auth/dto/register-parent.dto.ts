import {
  ArrayMinSize,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
  Matches,
  IsMobilePhone,
  IsArray,
  ArrayMaxSize,
  IsOptional,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ChildDto } from './child.dto';
import { EmergencyContactDto } from './emergency-contact.dto';
import { Match } from '../../common/decorators/match.decorator';
import { PASSWORD_REGEX } from '../../common/constants/password.regex';

export class RegisterParentDto {
  /* Étape 1 – Parent */
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName: string;

  @Transform(({ value }) => value?.trim())
  @IsMobilePhone(
    'fr-FR',
    { strictMode: false },
    {
      message: 'Le numéro de téléphone doit être un numéro français valide',
    },
  )
  phone: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'L’adresse doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'L’adresse est obligatoire' })
  @MinLength(5, { message: 'L’adresse doit contenir au moins 5 caractères' })
  address: string;

  @Transform(({ value }) => value?.trim())
  @IsString({
    message: 'La responsabilité légale doit être une chaîne de caractères',
  })
  @IsNotEmpty({ message: 'La responsabilité légale est obligatoire' })
  legalResponsibility: string;

  @IsOptional()
  @IsArray({ message: 'Les contacts d’urgence doivent être un tableau' })
  @ArrayMaxSize(2, { message: 'Au maximum 2 contacts d’urgence' })
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  /* Étape 2 – Enfant(s) */
  @ValidateNested({ each: true })
  @Type(() => ChildDto)
  @ArrayMinSize(1, { message: 'Au moins un enfant doit être renseigné' })
  children: ChildDto[];

  /* Étape 3 – Compte */
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: "L'adresse e-mail doit être valide" })
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(12, {
    message: 'Le mot de passe doit contenir au moins 12 caractères',
  })
  @Matches(PASSWORD_REGEX, {
    message:
      'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  password: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'La confirmation doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La confirmation du mot de passe est obligatoire' })
  @Match('password', {
    message: 'La confirmation ne correspond pas au mot de passe',
  })
  passwordConfirm: string;

  @IsOptional()
  notificationPrefs?: any;
}
